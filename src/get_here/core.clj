(ns get-here.core
  (:require [clj-time.core :as t]
            [clojure.core.memoize :as memo]
            [compojure.core :refer [GET defroutes]]
            [get-here.routes :as routes]
            [ring.adapter.jetty :as jetty]
            [ring.middleware.file-info :as file-info]
            [ring.middleware.json :as json]
            [ring.middleware.keyword-params :as keyword-params]
            [ring.middleware.params :as params]
            [ring.middleware.reload :as reload]
            [ring.middleware.resource :as resource]
            [ring.middleware.stacktrace :as stacktrace]
            [ring.util.response :as response]))

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
            (if-let [route (routes/best-path dt)]
              {:status 200, :body route}
              {:status 503, :body {:code 2 :reason "No route available"}}))
          (catch java.lang.NumberFormatException _
            {:status 400, :body {:code 1 :reason "Non-integer param"}}))))))



(def app
  (-> routes
      (json/wrap-json-response {:pretty true})
      (keyword-params/wrap-keyword-params)
      (params/wrap-params)
      (resource/wrap-resource "static")
      (file-info/wrap-file-info)))

(defn -main
  [port]
  (doseq [f [#'routes/best-path
             #'routes/trips-between]]
    (alter-var-root f #(memo/lru % :lru/threshold 100)))
  
  (jetty/run-jetty app {:port (Integer/parseInt port)}))

(defn -dev-main
  [port]
  (jetty/run-jetty (-> #'app
                       (reload/wrap-reload)
                       (stacktrace/wrap-stacktrace))
                   {:port (Integer/parseInt port)}))
