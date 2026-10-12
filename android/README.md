# Android APK

离线 WebView 应用，内置网页和商品图，支持 JSON 导入。进度保存在应用 WebView 的 localStorage，与浏览器进度独立；卸载会清除。

需要 Java 17、Android SDK（android-35）及 Build Tools 36.0.0。

运行 `powershell -ExecutionPolicy Bypass -File android/build-apk.ps1`，可通过 `-SdkPath`、`-BuildToolsVersion` 指定安装路径和版本。脚本直接使用 SDK 编译、打包和签名，不需要下载 Gradle 依赖。

输出：`downloads/RealLifeEnglish.apk`，为可安装的调试签名版本，非应用商店发行版。可运行 `adb install -r downloads/RealLifeEnglish.apk` 安装。

v1.1.0 起支持“检查更新”：查询 GitHub 最新正式 Release，比较三段版本号，下载同仓库的 `RealLifeEnglish.apk`，校验大小及 GitHub 提供的 SHA-256（若有），检查包名和版本编号后交给系统安装。需用户确认安装，不能静默更新。

后续发布需递增 `app/build.gradle` 的 `versionCode` 和 `versionName`，使用原 `android/.signing/debug.keystore` 构建，并创建 `vX.Y.Z` Release。请自行备份该签名文件，不上传仓库；更换签名会导致无法覆盖安装。
