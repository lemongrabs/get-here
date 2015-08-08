(ns get-here.ferry
  (:require [clj-time.core :as t]
            [clj-time.format :as f]
            [clj-time.predicates :as pr])
  (:import (org.joda.time LocalTime)))

;; http://www.sayvilleferry.com/schedule-pines.php

(def eastern (t/time-zone-for-id "US/Eastern"))

(def noon (LocalTime. 12 00))

(defn within?
  [[y1 m1 d1] [y2 m2 d2]]
  (let [ld1 (t/local-date y1 m1 d1)
        ld2 (t/local-date y2 m2 d2)]
    (fn [test-ld]
      (t/within? (.toDateTimeAtStartOfDay ld1 eastern)
                 (t/plus (.toDateTimeAtStartOfDay ld2 eastern)
                         (t/days 1))
                 (.toDateTime test-ld noon)))))

(defn on
  [year month day]
  (let [ld (t/local-date year month day)]
    (fn [test]
      (let [start-of-day (.toDateTimeAtStartOfDay ld eastern)]
        (t/within? start-of-day
                   (t/plus start-of-day (t/days 1))
                   (.toDateTime test noon))))))

(def not-on (comp complement on))

(def times
  {(within? [2015 6 26] [2015 9 13])
   {(every-pred pr/monday?
                (not-on 2015 9 7))
    [{(some-fn (not-on 2015 9 7)
               (on 2015 9 8))
      "5:45 AM"}
     "7:00 AM"
     "8:00 AM"
     "9:30 AM"
     "11:30 AM"
     "1:30 PM"
     "3:30 PM"
     "5:30 PM"
     "7:30 PM"
     "9:15 PM"]
    
    (some-fn pr/tuesday?
             pr/wednesday?)
    ["7:00 AM"
     "8:00 AM"
     "9:30 AM"
     "11:30 AM"
     "1:30 PM"
     "3:30 PM"
     "5:30 PM"
     "7:30 PM"
     "9:15 PM"]
    
    pr/thursday?
    ["7:00 AM"
     "8:00 AM"
     "9:30 AM"
     "11:30 AM"
     "1:30 PM"
     "3:30 PM"
     "5:30 PM"
     "7:30 PM"
     "8:30 PM"
     "10:15 PM"]

    (some-fn (every-pred pr/friday?
                         (not-on 2015 7 3))
             (on 2015 7 2))
    ["7:00 AM"
     "8:00 AM"
     "9:30 AM"
     "11:30 AM"
     "1:30 PM"
     "3:30 PM"
     "4:30 PM"
     "5:30 PM"
     "6:30 PM"
     "7:00 PM"
     "7:30 PM"
     "8:00 PM"
     "8:30 PM"
     "9:30 PM"
     "10:30 PM"]

    (some-fn (every-pred pr/saturday?
                         (not-on 2015 7 4))
             (on 2015 7 3))
    "12:15 AM"

    (some-fn pr/saturday?
             pr/sunday?
             (on 2015 7 3))
    ["8:00 AM"
     "9:25 AM"
     "10:25 AM"
     "11:25 AM"
     "12:25 PM"
     "1:25 PM"
     "2:20 PM"
     "3:20 PM"
     "4:20 PM"
     "5:20 PM"
     "6:20 PM"
     "7:20 PM"
     "8:20 PM"
     "9:20 PM"
     "10:30 PM"]}})

(defn parse-ferry-time
  [time-s]
  (LocalTime/parse time-s (f/formatter "hh:mm aa")))

(defn times-for
  ([d]
     (times-for d times))
  ([d times]
     (cond (string? times)
           (let [ferry-time (.toDateTime d (parse-ferry-time times) eastern)]
             [{:origin "Sayville"
               :destination "Sayville Dock"
               :towards "Sayville Dock"
               :route "Sayville Ferry Shuttle"
               :departure (.getMillis (t/minus ferry-time (t/minutes 15)))
               :arrival (.getMillis (t/minus ferry-time (t/minutes 5)))}
              {:origin "Sayville Dock"
               :destination "Fire Island Pines"
               :towards "Fire Island Pines"
               :route "Sayville Ferry"
               :departure (.getMillis ferry-time)
               :arrival (.getMillis (t/plus ferry-time (t/minutes 20)))}])
           
           (vector? times)
           (mapcat (partial times-for d) times)

           (map? times)
           (mapcat (fn [[pred? time]]
                     (when (pred? d) (times-for d time)))
                   times))))
