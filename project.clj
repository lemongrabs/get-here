(defproject get-here "0.1.0-SNAPSHOT"
  :dependencies [[org.clojure/clojure "1.6.0"]
                 [org.clojure/data.csv "0.1.2"]
                 [clj-time "0.7.0"]
                 [aysylu/loom "0.4.2"]
                 [ring "1.3.0"]
                 [ring/ring-jetty-adapter "1.3.0"]
                 [ring/ring-json "0.3.1"]
                 [cheshire "5.3.1"]
                 [compojure "1.1.8"]
                 [org.clojure/core.memoize "0.5.6"]]
  
  :main get-here.core
  
  :profiles {:dev {:main get-here.core/-dev-main}}

  :min-lein-version "2.0.0"
  :jar-name "get-here.jar"
  :uberjar-name "get-here-standalone.jar")
