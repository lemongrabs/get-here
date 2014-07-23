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
  {(within? [2014 5 22] [2014 6 26])
   {(every-pred pr/monday? (not-on 2014 5 26))
    [{(not-on 2014 5 26) "5:40 AM"}
     "7:00 AM"
     "9:30 AM"
     "11:30 AM"
     "1:30 PM"
     "3:30 PM"
     "5:30 PM"
     "7:30 PM"]
    
    (some-fn pr/tuesday? pr/wednesday? pr/thursday?)
    [{(on 2014 5 27) "5:40 AM"}
     "7:00 AM"
     "9:30 AM"
     "11:30 AM"
     "1:30 PM"
     "3:30 PM"
     "5:30 PM"
     "7:30 PM"
     {pr/thursday? "9:15 PM"}]
    
    pr/friday?
    ["7:00 AM"
     "9:30 AM"
     "11:30 AM"
     "1:30 PM"
     "3:30 PM"
     "4:30 PM"
     "5:30 PM"
     "6:30 PM"
     "7:30 PM"
     "8:30 PM"
     "9:30 PM"
     "10:30 PM"
     "12:00 AM"]
    
    (some-fn pr/saturday? pr/sunday? (on 2014 5 26))
    ["8:00 AM"
     "9:20 AM"
     "10:20 AM"
     "11:20 AM"
     "12:20 PM"
     "1:20 PM"
     {pr/sunday? "2:15 PM"}
     "3:15 PM"
     "4:15 PM"
     "5:15 PM"
     "6:15 PM"
     "7:15 PM"
     "8:15 PM"
     "9:15 PM"]}

   (within? [2014 6 27] [2014 9 7])
   {(every-pred pr/monday? (not-on 2014 9 1))
    ["5:45 AM"
     "7:00 AM"
     "8:00 AM"
     "9:30 AM"
     "11:30 AM"
     "1:30 PM"
     "3:30 PM"
     "5:30 PM"
     "7:30 PM"
     "8:30 PM"]
    
    (some-fn pr/tuesday? pr/wednesday?)
    [{(on 2014 9 2) "5:45 AM"}
     "7:00 AM"
     "8:00 AM"
     "9:30 AM"
     "11:30 AM"
     "1:30 PM"
     "3:30 PM"
     "5:30 PM"
     "7:30 PM"]
    
    (every-pred pr/thursday? (not-on 2014 7 3))
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

    (some-fn pr/friday? (on 2014 7 3))
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
     "10:30 PM"
     "12:00 AM"]
    
    (some-fn pr/saturday? pr/sunday?)
    ["8:00 AM"
     "9:20 AM"
     "10:20 AM"
     "11:20 AM"
     "12:20 PM"
     "1:20 PM"
     "2:15 PM"
     "3:15 PM"
     "4:15 PM"
     "5:15 PM"
     "6:15 PM"
     "7:15 PM"
     "8:15 PM"
     "9:15 PM"
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
