## Issue 1: framework

make the rough framework of every words:

- english name
- chinese name
- picture from coles site

All of them are stored in json files.

## Issue 2: Publish

### page

1. 将网页和图片上传 GitHub。
2. 仓库设为公开。
3. Settings → Pages，选择分支 `master` 和 `/(root)`，保存。
4. 等待部署完成，通过生成的网址访问。

### App

用 **WebView** 包装网页，再编译、打包、**签名**，生成 `downloads/RealLifeEnglish.apk`。

- wrap: webpage -> android app;
- complie: source code -> instructions can be ran by Android
- package: package the code and resources into an APK.
- sign: signing the APK so it can be installed by Android installer later

`Android installer(signed APK) → installed app`: The digital signature is already inside the APK. Android checks it before installing the app.

The signature connects different versions of the same app to the same signer.

Webpages' fundation is `.html` files. `.html` can also be the foundation of Android App, while Kotlin and Java are the most popular foundation for Apps. Their suffix are `.kt `and `.java` respectively.

WebView is an extension in Android application, which can show html, css and javascript on phone correctly.

An **APK is an Android app’s installation file**. You install the APK on your phone to get the app—like using an `.exe` installer on Windows.

## Issue 3: in-app updates(v1.1.0)

- Add a "Check Updates" button in HTML;
- Connect it to Java through WebView;
- Java checks Gihub's latest release, and  downloads a newer APK, then opens Android's installer for users' confirmation.

## Issue 4: Extend vocabulary

List of categories:

- Meat & Seafood：肉类与海鲜
- Fruit & Vegetables：果蔬
- Dairy, Eggs & Fridge：乳制品、蛋与冷藏食品
- Bakery：烘焙
- Deli：熟食
- Pantry：食品杂货
- Chips, Chocolates & Snacks：薯片、巧克力与零食
- International Foods：国际食品
- Health & Dietary：健康及特殊饮食
- Drinks：饮料
- Liquorland：酒类
- Frozen：冷冻食品
- Cleaning & Laundry：清洁与洗衣
- Health & Beauty：保健与美妆
- Baby：母婴
- Pet：宠物
- Home & Garden：家居与园艺
- Tobacco：烟草

来源：https://www.coles.com.au/browse

## Issue 5: User data

How to give every user a personalized account so that their data can be saved?

