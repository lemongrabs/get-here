(ns get-here.routes
  (:require [clj-time.core :as t]
            [clj-time.coerce :as c]
            [clj-time.format :as f]
            [clojure.data.csv :as csv]
            [clojure.java.io :as io]
            [clojure.string :as string]
            [get-here.ferry :as ferry]
            [loom.alg :as a]
            [loom.graph :as g])
  (:import (org.joda.time LocalTime)))

(defn keywordize
  [s]
  (keyword (clojure.string/replace s #"\_" "-")))

(defn read-header-csv
  [name]
  (with-open [in-file (io/reader (str "resources/google_transit/" name ".txt"))]
    (let [[header & lines] (doall (csv/read-csv in-file))
          keyword-header (map keywordize header)]
      (map #(zipmap keyword-header %) lines))))

(defn index-by
  [x s]
  (reduce #(assoc %1 (get %2 x) (dissoc %2 x)) {} s))

(def routes         (index-by :route-id  (read-header-csv "routes")))
(def trips          (index-by :trip-id   (read-header-csv "trips")))
(def stops          (index-by :stop-id   (read-header-csv "stops")))
(def stops-by-name  (index-by :stop-name (read-header-csv "stops")))
(def stop-times     (read-header-csv "stop_times"))
(def calendar-dates
  (let [{added "1", removed "2"} (group-by :exception-type (read-header-csv "calendar_dates"))]
    (->> added
         (map #(update-in % [:date] (partial f/parse-local-date (f/formatters :basic-date))))
         (map #(dissoc % :exception-type))
         (set))))

(defn trip-active-on?
  [trip local-date]
  (contains? calendar-dates {:date local-date
                             :service-id (:service-id trip)}))

(def eastern (t/time-zone-for-id "US/Eastern"))

(defn parse-time
  [time local-date]
  (let [[hour minute second] (map #(Integer/parseInt %) (string/split time #"\:"))
        local-time (LocalTime. (mod hour 24) minute second)]
    (.getMillis
     (.toDateTime (cond-> local-date (>= hour 24) (t/plus (t/days 1)))
                  local-time
                  eastern))))

(defn stop-times-on
  [local-date]
  (->> stop-times
       (map #(-> %
                 (update-in [:departure-time] parse-time local-date)
                 (update-in [:arrival-time] parse-time local-date)))
       (filter #(trip-active-on? (trips (:trip-id %)) local-date))))

(defn get-stop-id
  [name]
  (:stop-id (stops-by-name name)))

(defn get-route-id
  [name]
  (->> routes
       (vals)
       (filter #(= name (:route-long-name %)))
       (first)
       (:route-id)))

(defn trips-between
  [origin destination local-date]
  (let [stop-id-a (get-stop-id origin)
        stop-id-b (get-stop-id destination)]
    (->> (stop-times-on local-date)
         (filter #(#{stop-id-a stop-id-b} (:stop-id %)))
         (group-by :trip-id)
         (filter (fn [[stop-id ss]]
                   (= (map :stop-id ss)
                      [stop-id-a stop-id-b])))
         (map (fn [[trip-id [departure arrival]]]
                (let [trip (trips trip-id)]
                  {:origin origin
                   :destination destination
                   :towards (-> trip :trip-headsign)
                   :route (-> trip :route-id routes :route-long-name)
                   :departure (-> departure :departure-time)
                   :arrival (-> arrival :arrival-time)})))
         (sort-by :departure))))

(defn get-legs-for-trip
  [date]
  (->> (concat
        (mapcat (fn [[origin destination]]
                  (map #(assoc %
                          :origin origin
                          :destination destination)
                       (trips-between origin destination (.toLocalDate date))))
                [["Penn Station" "Babylon"]
                 ["Penn Station" "Jamaica"]
                 ["Babylon"      "Sayville"]
                 ["Jamaica"      "Sayville"]])
        (ferry/times-for (.toLocalDate date)))
       (filter #(or (not (map? %))
                    (> (:departure %) (.getMillis date))))))

(defn connected?
  [leg-a leg-b]
  (and (= (:destination leg-a)
          (:origin leg-b))
       (> (:departure leg-b)
          (:arrival leg-a))))

(defn connections-for
  [date from to]
  (let [legs (get-legs-for-trip date)]
    (concat (for [leg legs :when (= from (:origin leg))]
              [from leg 0])
            (for [leg legs :when (= to (:destination leg))]
              [leg to (- (:arrival leg) (.getMillis date))])
            (for [leg-a legs, leg-b legs :when (connected? leg-a leg-b)]
              [leg-a leg-b (- (:departure leg-b) (:arrival leg-a))]))))

(defn graph-for
  [date from to]
  (apply g/weighted-digraph
         (connections-for date from to)))

(def nyc-terminal? (partial contains? #{"Penn Station"}))

;; http://web.mta.info/lirr/about/TicketInfo/#Types
(defn peak?
  [{:keys [origin destination departure arrival]}]
  (let [departure (t/to-time-zone (c/from-long departure) eastern)
        arrival (t/to-time-zone (c/from-long arrival) eastern)]
    (or (and (nyc-terminal? destination)
             (<= 6 (t/hour arrival) 10))
        (and (nyc-terminal? origin)
             (<= 16 (t/hour departure) 20)))))

(defn to-simple-date
  [millis]
  (let [dt (t/to-time-zone (c/from-long millis) eastern)]
    {:month  (t/month dt)
     :day    (t/day dt)
     :hour   (t/hour dt)
     :minute (t/minute dt)}))

(defn best-path
  ([]
     (best-path (t/now)))
  ([date]
     (best-path date "Penn Station" "Fire Island Pines"))
  ([date from to]
     (when-let [route (seq (filter map? (a/shortest-path (graph-for date from to) from to)))]
       {:summary (let [departure (:departure (first route))
                       arrival (:arrival (last route))
                       minutes (/ (- arrival departure) (* 1000 60))]
                   {:origin (:origin (first route))
                    :destination (:destination (last route))
                    :departure (to-simple-date departure)
                    :arrival (to-simple-date arrival)
                    :duration {:hours (quot minutes 60)
                               :minutes (rem minutes 60)}})
        :route (map (fn [x]
                      (-> x
                          (assoc-in [:peak] (peak? x))
                          (update-in [:departure] to-simple-date)
                          (update-in [:arrival] to-simple-date)))
                    route)})))
