(ns get-here.optimus-babel.core
  (:require [clojure.string :as str]
            [v8.core :as v8]
            [optimus.assets.creation :refer [last-modified existing-resource]]))

(defn- escape [s]
  (-> s
      (str/replace "\\" "\\\\")
      (str/replace "'" "\\'")
      (str/replace "\n" "\\n")))

(defn- throw-v8-exception [#^String text path]
  (if (= (.indexOf text "ERROR: ") 0)
    (let [prefix (when path (str "Exception in " path ": "))
          error (clojure.core/subs text 7)]
      (throw (Exception. (str prefix error))))
    text))

(defn- run-script-with-error-handling [context script file-path]
  (throw-v8-exception
   (try
     (v8/run-script-in-context context script)
     (catch Exception e
       (str "ERROR: " (.getMessage e))))
   file-path))

(defn normalize-line-endings [s]
  (-> s
      (str/replace "\r\n" "\n")
      (str/replace "\r" "\n")))

(defn create-babel-context []
  (let [context (v8/create-context)]
    (v8/run-script-in-context context (slurp "node_modules/babel-core/browser.js"))
    context))

(defn jsx-code [js]
  (str "babel.transform('" (escape (normalize-line-endings js)) "').code;"))

(defn transform
  ([jsx] (transform jsx {}))
  ([jsx options] (transform (create-babel-context) jsx options))
  ([context jsx options]
   (run-script-with-error-handling context (jsx-code jsx) (:path options))))

(defn load-jsx-asset
  [public-dir path]
  (let [resource (existing-resource public-dir path)]
    {:path (str/replace path #"\.jsx$" ".js")
     :original-path path
     :contents (transform (slurp resource) {:path path})
     :last-modified (last-modified resource)}))

(defmethod optimus.assets.creation/load-asset "jsx"
  [public-dir path]
  (load-jsx-asset public-dir path))
