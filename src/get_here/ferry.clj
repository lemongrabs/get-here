(ns get-here.ferry
  (:require [clj-time.core :as t]
            [clj-time.format :as f]
            [clj-time.predicates :as pr]
            [clj-time.coerce :as c])
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

(defn starts
  [y m d]
  (let [ld (t/local-date y m d)]
    (fn [test-ld]
      (t/after? (.toDateTimeAtStartOfDay test-ld eastern)
                (t/minus (.toDateTimeAtStartOfDay ld)
                         (t/days 1))))))

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
  {(within? [2016 4 8] [2016 5 25])
   {pr/monday?
    ["7:00 AM"
     "10:30 AM"
     {(starts 2016 5 16) "12:15 PM"}
     "3:30 PM"
     "5:10 PM"]

    (some-fn pr/tuesday? pr/wednesday? pr/thursday?)
    ["7:00 AM"
     "10:15 AM"
     {(starts 2016 5 12) "12:15 AM"}
     "3:30 PM"
     "5:10 PM"]

    (every-pred pr/friday?)
    ["7:00 AM"
     "10:30 AM"
     "1:30 PM"
     "3:30 PM"
     {(starts 2016 4 15) "5:30 PM"}
     "6:30 PM"
     {(starts 2016 4 15) "7:30 PM"}
     "8:30 PM"
     {(starts 2016 4 22) "9:30 PM"}]

    (every-pred pr/saturday?)
    ["8:00 AM"
     "9:25 AM"
     "10:25 AM"
     "11:25 AM"
     {(starts 2016 4 23) "12:25 PM"}
     "1:25 PM"
     "3:20 PM"
     "4:20 PM"
     "6:00 PM"
     {(starts 2016 4 23) "8:00 PM"}]

    (every-pred pr/sunday?)
    ["9:25 AM"
     "11:25 AM"
     {(starts 2016 4 24) "12:25 PM"}
     "1:25 PM"
     {(starts 2016 4 24) "2:20 PM"}
     "3:30 PM"
     "4:20 PM"
     "5:20 PM"
     "6:20 PM"
     {(starts 2016 4 24) "7:20 PM"}]}})

(defn parse-ferry-time
  [time-s]
  (LocalTime/parse time-s (f/formatter "hh:mm aa")))

(defn times-for
  ([d]
   (times-for d times))
  ([d x]
   (cond (string? x)
         [(c/to-date (.toDateTime d (parse-ferry-time x) eastern))]

         (vector? x)
         (mapcat (partial times-for d) x)

         (map? x)
         (mapcat (fn [[pred? time]]
                   (when (pred? d) (times-for d time)))
                 x))))
