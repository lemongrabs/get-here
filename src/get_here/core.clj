(ns get-here.core
  (:require [org.httpkit.client :as http]
            [clojure.core.memoize :as memo]
            [compojure.core :refer [GET POST defroutes]]
            [ring.adapter.jetty :as jetty]
            [ring.middleware.file-info :refer [wrap-file-info]]
            [ring.middleware.format-params :refer [wrap-restful-params]]
            [ring.middleware.format-response :refer [wrap-restful-response]]
            [ring.middleware.params :as params]
            [ring.middleware.reload :as reload]
            [ring.middleware.resource :as resource]
            [ring.middleware.stacktrace :as stacktrace]
            [ring.util.response :as response]
            [environ.core :as env]
            [clojure.data.json :as json]
            [clojure.walk :as walk]
            [get-here.ferry :as ferry]
            [clj-time.coerce :as c]
            [clj-time.core :as t])
  (:import [java.util Date]
           [java.time ZonedDateTime Instant ZoneId LocalDate DayOfWeek]
           [java.time.temporal ChronoUnit]))

(defn epoch-seconds->date [epoch-seconds]
  (Date/from (Instant/ofEpochMilli (* 1000 epoch-seconds))))

(defn seconds->duration [seconds]
  {:hours (-> seconds
              (/ 3600)
              long)
   :minutes (-> seconds
                (/ 60)
                long
                (mod 60))})

(defn google-api-key []
  (environ.core/env :google-api-key))

(defn google-transit-directions [from to arrive-by]
  {:pre [(instance? Date arrive-by)]}
  (future (-> (http/get "https://maps.googleapis.com/maps/api/directions/json"
                        {:query-params {:origin from
                                        :destination to
                                        :mode "transit"
                                        :arrival_time (long (/ (.. arrive-by
                                                                   (toInstant)
                                                                   (minus 12 ChronoUnit/MINUTES)
                                                                   (toEpochMilli))
                                                               1000))
                                        :key (google-api-key)}})
              (deref)
              (update :body json/read-str)
              (update :body walk/keywordize-keys))))

(defn transit-step?
  "Returns true if the provided step is a transit step (as opposed to
  a walking step)."
  [step]
  (contains? step :transit_details))

(def nyc-terminal? (partial contains? #{"Penn Station"}))

(defn weekday? [zdt]
  {pre [(instance? ZonedDateTime zdt)]}
  (some? (#{DayOfWeek/MONDAY
            DayOfWeek/TUESDAY
            DayOfWeek/WEDNESDAY
            DayOfWeek/THURSDAY
            DayOfWeek/FRIDAY}
          (.getDayOfWeek zdt))))

(defn peak? [{:keys [origin destination departure arrival] :as directions}]
  {:pre [(instance? Date departure)
         (instance? Date arrival)]}
  (let [ny (ZoneId/of "America/New_York")
        departure-instant (ZonedDateTime/ofInstant (.toInstant departure) ny)
        arrival-instant (ZonedDateTime/ofInstant (.toInstant arrival) ny)]
    (or (and (weekday? departure-instant)
             (nyc-terminal? origin)
             (<= 6 (.getHour departure-instant) 10))
        (and (weekday? arrival-instant)
             (nyc-terminal? arrival)
             (<= (.getHour arrival-instant) 20)))))

(defn reformat-directions [body]
  (let [directions (get-in body [:routes 0 :legs 0])
        route (->> (get-in directions [:steps])
                   (filter transit-step?)
                   (map (fn [step]
                          {:origin      (get-in step [:transit_details :departure_stop :name])
                           :destination (get-in step [:transit_details :arrival_stop :name])
                           :towards     (get-in step [:transit_details :headsign])
                           :route       (get-in step [:transit_details :line :name])
                           :departure   (epoch-seconds->date (get-in step [:transit_details :departure_time :value]))
                           :arrival     (epoch-seconds->date (get-in step [:transit_details :arrival_time :value]))}))
                   (mapv (fn [step]
                           (assoc step :peak (peak? step)))))
        first-stop (first route)
        last-stop (last route)]
    {:summary
     {:origin      (:origin first-stop)
      :destination (:destination last-stop)
      :departure   (:departure first-stop)
      :arrival     (:arrival last-stop)
      :duration    (-> (t/interval (c/from-date (:departure first-stop))
                                   (c/from-date (:arrival last-stop)))
                       (t/in-seconds)
                       (seconds->duration))}
     :route route}))

(defn date-before-today? [date]
  {:pre [(instance? java.util.Date date)]}
  (.. date
      (toInstant)
      (atZone (ZoneId/of "America/New_York"))
      (toLocalDate)
      (isBefore (LocalDate/now (ZoneId/of "America/New_York")))))

(defroutes routes
  (GET "/" []
    (response/resource-response "static/index.html"))

  (POST "/ferries" {{:keys [date]} :body-params :as request}
    (println "Request: " request)
    (cond
      (nil? date)
      {:status 400, :body {:code 0, :reason "Provided map must contain the key: :date"} }
      
      (not (instance? Date date))
      {:status 400, :body {:code 1, :reason "Value provided for :date must be a Date."}}

      :else
      {:status 200 :body {:times (ferry/times-for (.toLocalDate (c/from-date date)))}}))
  
  
  (POST "/directions" {{:keys [arrive-by]} :body-params}
    (cond
      (nil? arrive-by)
      {:status 400, :body {:code 0, :reason "Provided map must contain the key: :arrive-by"} }
      
      (not (instance? Date arrive-by))
      {:status 400, :body {:code 1, :reason "Value provided for :arrive-by must be a Date."}}

      :else
      (if (date-before-today? arrive-by)
        {:status 200, :body {:code 2 :reason "No route available"}}
        (let [{:keys [status body] :as response} @(google-transit-directions
                                                   "Pennsylvania Station, New York, NY"
                                                   "40°44'25.4\"N 73°05'11.4\"W"
                                                   arrive-by)]
          (condp = (:status body)
            "OK"             {:status 200, :body (reformat-directions body)}
            "ZERO_RESULTS"   {:status 200, :body {:code 2 :reason "No route available"}}
            "REQUEST_DENIED" {:status 500, :body {:code 3, :reason (:error-message body)}}
            {:status 500, :body {:code 4 :reason "No idea."}}))))))



(def app
  (-> routes
      (wrap-restful-params)
      (wrap-restful-response)
      (params/wrap-params)
      (resource/wrap-resource "static")
      (wrap-file-info)))

(defn -main
  [port]
  (jetty/run-jetty (-> #'app
                       (reload/wrap-reload)
                       (stacktrace/wrap-stacktrace))
                   {:port (Integer/parseInt port)}))
