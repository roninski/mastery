[app]

title = Mastery
package.name = mastery
package.domain = io.roninski

source.dir = .
source.include_exts = py,png,jpg,kv,atlas,html,css,js
source.exclude_dirs = .venv,data,.git,.buildozer,libs

version = 0.1

requirements = python3,jnius,bottle,proxy_tools,typing_extensions,pywebview

p4a.bootstrap = webview

android.permissions = INTERNET
android.api = 33
android.minapi = 24
android.ndk = 25b
android.archs = arm64-v8a

android.add_jars = libs/pywebview-android.jar

orientation = portrait
fullscreen = 0

[buildozer]
log_level = 2
warn_on_root = 1
