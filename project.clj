(defproject get-here "0.1.1-SNAPSHOT"
  :dependencies [[org.clojure/clojure "1.7.0"]
                 [org.clojure/core.memoize "0.5.6"]
                 [org.clojure/data.csv "0.1.2"]
                 [org.clojure/data.json "0.2.6"]
                 [ring "1.3.0"]
                 [ring/ring-jetty-adapter "1.3.0"]
                 [ring-middleware-format "0.5.0"]
                 [clj-time "0.7.0"]
                 [aysylu/loom "0.4.2"]
                 [cheshire "5.3.1"]
                 [compojure "1.1.8"]
                 [http-kit "2.1.18"]
                 [environ "1.0.0"]
                 [hiccup "1.0.5"]
                 [optimus "0.18.1"]
                 [optimus-jsx "0.1.1"]
                 [optimus-sass "0.0.3"]]

  :main get-here.core

  :repl-options {:init-ns get-here.core}

  :min-lein-version "2.0.0"
  :jar-name "get-here.jar"
  :uberjar-name "get-here-standalone.jar"

  :profiles {:dev {:plugins [[lein-shell "0.3.0"]]}}

  :prep-tasks [["shell" "./build_js_sources.sh"]])
