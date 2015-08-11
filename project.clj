(defproject get-here "0.1.1-SNAPSHOT"
  :dependencies [[org.clojure/clojure "1.7.0"]
                 [org.clojure/data.csv "0.1.2"]
                 [clj-time "0.7.0"]
                 [aysylu/loom "0.4.2"]
                 [ring "1.3.0"]
                 [ring/ring-jetty-adapter "1.3.0"]
                 [ring-middleware-format "0.5.0"]
                 [cheshire "5.3.1"]
                 [compojure "1.1.8"]
                 [org.clojure/core.memoize "0.5.6"]
                 [http-kit "2.1.18"]
                 [environ "1.0.0"]
                 [org.clojure/data.json "0.2.6"]]

  :plugins [[lein-watch "0.0.2"]
            [lein-haml-sass "0.2.7-SNAPSHOT"]
            [lein-asset-minifier "0.2.3"]]

  :scss {:src "resources/static/scss"
         :output-directory "resources/static/css"
         :output-extension "css"}

  :minify-assets
    {:assets
      {"resources/static/public/app.min.css" ["resources/static/vendor"
                                                 "resources/static/css"]
       "resources/static/public/vendor.min.js"  ["resources/static/vendor/jquery.min.js"
                                                 "resources/static/vendor/bootstrap"
                                                 "resources/static/vendor/datepicker"
                                                 "resources/static/vendor/underscore.min.js"
                                                 "resources/static/vendor/react.min.js"
                                                 "resources/static/vendor/transit-0.8.807.js"
                                                 "resources/static/vendor/moment.min.js"]}}

  :watch {
    :rate 500
    :watchers {
      :scss {:watch-dirs ["resources/static/scss" "resources/static/vendor"]
             :file-patterns [#"\.scss"]
             :tasks ["scss once" "minify-assets"]}
      :js   {:watch-dirs ["resources/static/js" "resources/static/vendor"]
             :file-patterns [#"\.js"]
             :tasks ["minify-assets"]}}}

  :aliases {"build" ["do" ["scss" "once"] ["minify-assets"]]}

  :main get-here.core

  :repl-options {:init-ns get-here.core}

  :min-lein-version "2.0.0"
  :jar-name "get-here.jar"
  :uberjar-name "get-here-standalone.jar")
