(ns get-here.core
  (:require [org.httpkit.client :as http]
            [clojure.core.memoize :as memo]
            [compojure.core :refer [GET POST defroutes]]
            [ring.adapter.jetty :as jetty]
            [ring.middleware.file-info :as file-info]
            [ring.middleware.format-params :refer [wrap-restful-params]]
            [ring.middleware.format-response :refer [wrap-restful-response]]
            [ring.middleware.keyword-params :as keyword-params]
            [ring.middleware.params :as params]
            [ring.middleware.reload :as reload]
            [ring.middleware.resource :as resource]
            [ring.middleware.stacktrace :as stacktrace]
            [ring.util.response :as response]
            [environ.core :as env]
            [clojure.data.json :as json]
            [clojure.walk :as walk])
  (:import [java.util Date]
           [java.time ZonedDateTime Instant ZoneId]))

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
                                        :arrival_time (/ (.. arrive-by
                                                             (toInstant)
                                                             (toEpochMilli))
                                                         1000)
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

(defn peak?
  [step]
  {:pre [(transit-step? step)]}
  #_
  (or (and (nyc-terminal? departure-stop)
           (<= 6 arrival-hour 10))
      (and (nyc-terminal? arrival-stop)
           (<= 16 departure-hour 20))))

(defn reformat-directions [body]
  (let [directions (get-in body [:routes 0 :legs 0])]
    {:summary
     {:origin      (get-in directions [:start_address])
      :destination (get-in directions [:end_address])
      :departure   (epoch-seconds->date (get-in directions [:departure_time :value]))
      :arrival     (epoch-seconds->date (get-in directions [:arrival_time :value]))
      :duration    (seconds->duration (get-in directions [:duration :value]))}
     :route
     (->> (get-in directions [:steps])
          (filter transit-step?)
          (map (fn [step]
                 {:origin      (get-in step [:transit_details :departure_stop :name])
                  :destination (get-in step [:transit_details :arrival_stop :name])
                  :towards     (get-in step [:transit_details :headsign])
                  :route       (get-in step [:transit_details :line :name])
                  :departure   (epoch-seconds->date (get-in step [:transit_details :departure_time :value]))
                  :arrival     (epoch-seconds->date (get-in step [:transit_details :arrival_time :value]))
                  ;; :peak        (peak? step)
                  })))}))

#_ ;; example response
{:summary
 {:origin "Penn Station",
  :destination "Fire Island Pines",
  :departure {:month 7, :day 10, :hour 7, :minute 49},
  :arrival {:month 7, :day 10, :hour 9, :minute 50},
  :duration {:hours 2, :minutes 1}},
 :route
 ({:origin "Penn Station",
   :destination "Babylon",
   :towards "Babylon",
   :route "Babylon",
   :departure {:month 7, :day 10, :hour 7, :minute 49},
   :arrival {:month 7, :day 10, :hour 8, :minute 47},
   :peak false}
  {:origin "Babylon",
   :destination "Sayville",
   :towards "Montauk",
   :route "Montauk",
   :departure {:month 7, :day 10, :hour 8, :minute 52},
   :arrival {:month 7, :day 10, :hour 9, :minute 9},
   :peak false}
  {:origin "Sayville",
   :destination "Sayville Dock",
   :towards "Sayville Dock",
   :route "Sayville Ferry Shuttle",
   :departure {:month 7, :day 10, :hour 9, :minute 15},
   :arrival {:month 7, :day 10, :hour 9, :minute 25},
   :peak false}
  {:origin "Sayville Dock",
   :destination "Fire Island Pines",
   :towards "Fire Island Pines",
   :route "Sayville Ferry",
   :departure {:month 7, :day 10, :hour 9, :minute 30},
   :arrival {:month 7, :day 10, :hour 9, :minute 50},
   :peak false})}

(defroutes routes
  (GET "/" []
    (response/resource-response "static/index.html"))
  
  (POST "/directions" {{:keys [arrive-by]} :body-params}
    (cond
      (nil? arrive-by)
      {:status 400, :body {:code 0, :reason "Provided map must contain the key: :arrive-by"} }
      
      (not (instance? Date arrive-by))
      {:status 400, :body {:code 1, :reason "Value provided for :arrive-by must be a Date."}}

      :else
      (let [{:keys [status body] :as response} @(google-transit-directions
                                                 "Pennsylvania Station, New York, NY"
                                                 "Sayville Ferry Services, 41 River Road, Sayville, NY 11782"
                                                 arrive-by)]
        (condp = (:status body)
          "OK"             {:status 200, :body (reformat-directions body)}
          "ZERO_RESULTS"   {:status 503, :body {:code 2 :reason "No route available"}}
          "REQUEST_DENIED" {:status 500, :body {:code 3, :reason (:error-message body)}}
                           {:status 500, :body {:code 4 :reason "No idea."}})))))



(def app
  (-> routes
      (wrap-restful-params)
      (wrap-restful-response)
      #_(keyword-params/wrap-keyword-params)
      (params/wrap-params)
      (resource/wrap-resource "static")
      (file-info/wrap-file-info)))

#_(defn -main
  [port]
  (doseq [f [#'routes/best-path
             #'routes/trips-between]]
    (alter-var-root f #(memo/lru % :lru/threshold 100)))
  
  (jetty/run-jetty app {:port (Integer/parseInt port)}))

(defn -main
  [port]
  (jetty/run-jetty (-> #'app
                       (reload/wrap-reload)
                       (stacktrace/wrap-stacktrace))
                   {:port (Integer/parseInt port)}))
