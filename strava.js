// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: bicycle;

// Strava Scriptable Widget by @dwd0tcom
// Version 0.1.0
let clientID, clientSecret, refreshToken, data, miles, kmh, name
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

const textColor = Color.dynamic(new Color('EDEDED'), new Color('fffff'));
const bg1 = new Color('ED7D30')
const bg2 = new Color('E8622C')

const apiURL = (clientID, clientSecret, refreshToken) => `https://www.strava.com/oauth/token?client_id=${clientID}&client_secret=${clientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`

let latestActivity = await loadActivity(clientID, clientSecret, refreshToken)
let widget = await createWidget(latestActivity)
widget.url = "strava://feed"

if (!config.runsInWidget) {
  await widget.presentSmall()
}

Script.setWidget(widget)
Script.complete()

async function loadActivity(clientID, clientSecret, refreshToken) {

  const req = new Request(apiURL(clientID, clientSecret, refreshToken))
  req.method = "POST"
  let response = await req.loadJSON()
  const accessToken = response.access_token
  const data = await new Request(callActivities + accessToken + "&per_page=1").loadJSON()

  return data
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

  //Set strava colors as background gradient
  const gradient = new LinearGradient()
  gradient.locations = [0, 1]
  gradient.colors = [
    bg1,
    bg2
  ]

  list.backgroundGradient = gradient

  const latestActivity = data[0].name

  let activityName = list.addText(latestActivity)
  activityName.font = Font.blackRoundedSystemFont(15)
  activityName.textColor = textColor

  list.addSpacer()

  let detailsStackFirstRow = list.addStack()

  // Get latest Distance
  const latestDistance = data[0].distance
  let num = (latestDistance / 1000).toString()
  let roundedDistance = num.slice(0, (num.indexOf("."))+3)

  let distance = detailsStackFirstRow.addText(roundedDistance + " km")
  distance.font = Font.mediumSystemFont(10)
  distance.textColor = textColor
  distance.lineLimit = 1

  detailsStackFirstRow.addSpacer()

  // Get latest average speed
  const averageSpeedData = data[0].average_speed
  let averageSpeed = milesToKm(averageSpeedData).toFixed(2)
  let averageSpeedText = detailsStackFirstRow.addText("Ø " + averageSpeed + " km/h")
  averageSpeedText.font = Font.mediumSystemFont(10)
  averageSpeedText.textColor = textColor

  let detailsStackSecondRow = list.addStack()

  // Get max speed
  const maxSpeedData = data[0].max_speed
  let maxSpeed = milesToKm(maxSpeedData).toFixed(1)
  let maxSpeedText = detailsStackSecondRow.addText("Max. " + maxSpeed +  " km/h")
  maxSpeedText.font = Font.mediumSystemFont(10)
  maxSpeedText.textColor = textColor

  detailsStackSecondRow.addSpacer()

  // Get kudos
  const kudosData = data[0].kudos_count
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

  return list
}
