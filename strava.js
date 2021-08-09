// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: bicycle;

// #############################################
// ### Strava Scriptable Widget by @dwd0tcom ###
// #############################################
// ############# Version 1.0.0 #################
// #############################################
//
// Changelog:
//    V 1.0.0
//        – Added support for Strava's highlight image
//        — Better error handling
//        — Added offline fallback for image + json data
//
// #############################################
// #############################################
//
// If you find any bug or problem, please report to:
// https://github.com/dwd0tcom/strava-scriptable-widget
//
// #############################################
// ################## CONFIG ###################
// #############################################
//
// Set to false if you don't want to see a photo
const photoWidget = true
//
// #############################################
// #############################################

let clientID, clientSecret, refreshToken, data, miles, kmh, name, activityId, img
const callActivities = `https://www.strava.com/api/v3/athlete/activities?access_token=`
let widgetInput = args.widgetParameter

if (widgetInput !== null) {
  [clientID, clientSecret, refreshToken] = widgetInput.split("|");

  if (!clientID || !clientSecret || !refreshToken) {
    throw new Error("Invalid parameter. Expected format: clientID|ClientSecret|RefreshToken")
  }

} else {
  throw new Error("No parameters set. Please insert your paremeters like this: clientID|ClientSecret|RefreshToken")
}

const apiURL = (clientID, clientSecret, refreshToken) => `https://www.strava.com/oauth/token?client_id=${clientID}&client_secret=${clientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`

const saveStravaData = (data) => {
	let fm = FileManager.iCloud();
	let path = fm.joinPath( fm.documentsDirectory(), 'strava-data.json' );
	fm.writeString(path, JSON.stringify(data));
};

const saveImage = (img) => {
	let fm = FileManager.iCloud();
	let path = fm.joinPath( fm.documentsDirectory(), 'strava-image.jpg' );
	fm.writeImage(path, img);
};

const getSavedStravaData = () => {
	let fm = FileManager.iCloud();
	let path = fm.joinPath(fm.documentsDirectory(), 'strava-data.json');
	let data = fm.readString( path );
	return JSON.parse(data);
};

const getSavedImage = () => {
	let fm = FileManager.iCloud();
	let path = fm.joinPath(fm.documentsDirectory(), 'strava-image.jpg');
	let img = fm.readImage( path );
	return img;
};

let latestActivity = await loadActivity(clientID, clientSecret, refreshToken)
let widget = await createWidget(latestActivity)
widget.url = "strava://feed"

if (!config.runsInWidget) {
  await widget.presentSmall()
}

Script.setWidget(widget)
Script.complete()

async function loadActivity(clientID, clientSecret, refreshToken) {
  try {
    const req = new Request(apiURL(clientID, clientSecret, refreshToken))
    req.method = "POST"
    let response = await req.loadJSON()
    const accessToken = response.access_token

    // Get data of latest activity, in this case just the ID
    const dataComplete = await new Request(callActivities + accessToken + "&per_page=1").loadJSON()
    const activityId = dataComplete[0].id

    // Get latest activity, complete dataset for images. Kinda annyoing...
    const callSingleActivity = `https://www.strava.com/api/v3/activities/`
    let data = await new Request(callSingleActivity + activityId + "?access_token=" + accessToken).loadJSON()

    // Save file to local
    saveStravaData(data)
    console.log('using online data')

    return data

  } catch (e) {
    // If API is offline, use local data
    data = getSavedStravaData();
    console.log('using saved data')
    return data

  }
}

async function createWidget(data) {

  let milesToKm = (miles) => {
    kmh = miles * 3600 / 1000
    return kmh
  }

  let createSymbol = (name) => {
    let font = Font.mediumSystemFont(10)
    let sym = SFSymbol.named(name)
    sym.applyFont(font)

    return sym
  }

  const list = new ListWidget()

  //Check if activits has at least one photo
  const hasPhoto = data.total_photo_count

  // Set Colors
  let bg1 = new Color('ED7D30')
  let bg2 = new Color('E8622C')
  let bg3;
  let textColor;

  if(hasPhoto > 0) {
    textColor = new Color('#ffffff')
  } else {
    textColor = Color.dynamic(new Color('#ffffff'), new Color('#000000'));
  }

  // Get latest Acitivity Name
  const latestActivity = data.name

  let activityName = list.addText(latestActivity)
  activityName.font = Font.blackRoundedSystemFont(18)
  activityName.textColor = textColor
  activityName.minimumScaleFactor = 0.7

  list.addSpacer()

  let detailsStackFirstRow = list.addStack()

  // Get latest Distance
  const latestDistance = data.distance
  let num = (latestDistance / 1000).toString()
  let roundedDistance = num.slice(0, (num.indexOf("."))+3)

  let distance = detailsStackFirstRow.addText(roundedDistance + " km")
  distance.font = Font.mediumSystemFont(10)
  distance.textColor = textColor
  distance.lineLimit = 1

  detailsStackFirstRow.addSpacer()

  // Get latest average speed
  const averageSpeedData = data.average_speed
  let averageSpeed = milesToKm(averageSpeedData).toFixed(2)
  let averageSpeedText = detailsStackFirstRow.addText("Ø " + averageSpeed + " km/h")
  averageSpeedText.font = Font.mediumSystemFont(10)
  averageSpeedText.textColor = textColor

  let detailsStackSecondRow = list.addStack()

  // Get max speed
  const maxSpeedData = data.max_speed
  let maxSpeed = milesToKm(maxSpeedData).toFixed(1)
  let maxSpeedText = detailsStackSecondRow.addText("Max. " + maxSpeed +  " km/h")
  maxSpeedText.font = Font.mediumSystemFont(10)
  maxSpeedText.textColor = textColor

  detailsStackSecondRow.addSpacer()

  // Get kudos
  const kudosData = data.kudos_count
  const kudosImage = createSymbol("hand.thumbsup")

  let kudosLine = detailsStackSecondRow.addStack()
  kudosLine.layoutHorizontally()

  let kudos = kudosLine.addText(kudosData.toString())
  kudos.font = Font.mediumSystemFont(10)
  kudos.textColor = textColor

  kudosLine.addSpacer(2)

  let kudosImageInline = kudosLine.addImage(kudosImage.image)
  kudosImageInline.resizeable = false
  kudosImageInline.imageSize = new Size(10, 10)
  kudosImageInline.tintColor = textColor

  if(hasPhoto > 0 && photoWidget) {
    const images = data.photos;

    //Get a photo from the activity
    const imgUrl = data.photos.primary.urls["600"];

    try {
      img = await loadImage(imgUrl)
      saveImage (img)
      console.log('using online image')
    } catch (e) {
      img = getSavedImage()
      console.log('using saved image')
    }


    bg1 = new Color('#00000000')
    bg2 = new Color('#00000000')
    bg3 = new Color('#000000CC')

    gradient = new LinearGradient()
    gradient.locations = [0, 0.5, 1]
    gradient.colors = [bg1, bg2, bg3]

    list.backgroundImage = img;
    list.backgroundGradient = gradient

    // Give headline some shadow
    activityName.shadowColor = bg3
    activityName.shadowRadius = 6

    // Fix texcolor to not be dynamic
    textColor = Color.dynamic(new Color('fff000'), new Color('f00000'));


  } else {

    let gradient = new LinearGradient()
    gradient.locations = [0, 1]
    gradient.colors = [
      bg1,
      bg2
    ]

    list.backgroundGradient = gradient
  }

  return list
}

async function loadImage(imgUrl) {
  let imgReq = new Request(imgUrl)
  return await imgReq.loadImage()
}
