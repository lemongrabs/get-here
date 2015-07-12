(ns get-here.core
  (:require [org.httpkit.client :as http]
            [clj-time.core :as t]
            [clojure.core.memoize :as memo]
            [compojure.core :refer [GET defroutes]]
            [get-here.routes :as routes]
            [ring.adapter.jetty :as jetty]
            [ring.middleware.file-info :as file-info]
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
  (:import [java.util Date]))

(defn unix-time->date [unix-time]
  (-> unix-time (* 1000) (Date.)))

(defn seconds->duration [seconds]
  {:hours (-> seconds
              (/ 3600)
              long)
   :minutes (-> seconds
                (/ 60)
                (mod 60))})

(defn google-api-key []
  (environ.core/env :google-api-key))

(defn google-transit-directions [from to]
  (let [directions (-> (http/get "https://maps.googleapis.com/maps/api/directions/json"
                                 {:query-params {:origin from
                                                 :destination to
                                                 :mode "transit"
                                                 :transit_mode "train"
                                                 :key (google-api-key)}})
                       (deref)
                       (:body)
                       (json/read-str)
                       (walk/keywordize-keys) (get-in [:routes 0 :legs 0]))]
    {:summary
     {:origin      (get-in directions [:start_address])
      :destination (get-in directions [:end_address])
      :departure   (unix-time->date (get-in directions [:departure_time :value]))
      :arrival     (unix-time->date (get-in directions [:arrival_time :value]))
      :duration    (seconds->duration (get-in directions [:duration :value]))}
     :route
     (->> (get-in directions [:steps])
          (map (fn [step]
                 {:origin      (get-in step [:transit_details :departure_stop :name])
                  :destination (get-in step [:transit_details :arrival_stop :name])
                  :towards     (get-in step [:transit_details :headsign])
                  :route       (get-in step [:transit_details :line :name])
                  :departure   (unix-time->date (get-in step [:transit_details :departure_time :value]))
                  :arrival     (unix-time->date (get-in step [:transit_details :arrival_time :value]))
                  :peak        :tbd})))}))

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

(def eastern (t/time-zone-for-id "US/Eastern"))

(defroutes routes
  (GET "/" []
    (response/resource-response "static/index.html"))
  
  (GET "/directions" {params :params}
    (let [all ((juxt :year :month :day :hour :minute) params)]
      (if (some nil? all)
        {:status 400, :body {:code 0 :reason "Missing param"}}
        (try
          (let [dt (-> (apply t/date-time (map #(Integer/parseInt %) all))
                       (t/from-time-zone eastern))]
            {:status 200, :body (google-transit-directions "Penn Station, New York, NY" "Sayville, NY")})
          (catch java.lang.NumberFormatException _
            {:status 400, :body {:code 1 :reason "Non-integer param"}}))))))



(def app
  (-> routes
      (wrap-restful-response)
      (keyword-params/wrap-keyword-params)
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
