// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: bicycle;

// #############################################
// ### Strava Scriptable Widget by @dwd0tcom ###
// #############################################
// ############# Version 1.1.0 #################
// #############################################
//
// Changelog:
//    V 1.0.0
//        – Added support for Strava's highlight image
//        — Better error handling
//        — Added offline fallback for image + json data
//    V 1.1.0
//        - added medium widget for three sport types (triathlon)
//        - added support to run the script from inside the app 
//        TODO: better icons / original icons from strava
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
const MAX_Y_HEIGHT = 75; // for medium widget
//
// #############################################
// #############################################

// function definitions for data processing and small widget
const saveStravaData = (data) => {
  let fm = FileManager.iCloud();
  let path = fm.joinPath(fm.documentsDirectory(), 'strava-data.json');
  fm.writeString(path, JSON.stringify(data));
};

const saveImage = (img) => {
  let fm = FileManager.iCloud();
  let path = fm.joinPath(fm.documentsDirectory(), 'strava-image.jpg');
  fm.writeImage(path, img);
};

const getSavedStravaData = (filename) => {
  filename = filename ? filename : 'strava-data.json'
  let fm = FileManager.iCloud();
  let path = fm.joinPath(fm.documentsDirectory(), filename);
  let data = fm.readString(path);
  return JSON.parse(data);
};

const getSavedImage = () => {
  let fm = FileManager.iCloud();
  let path = fm.joinPath(fm.documentsDirectory(), 'strava-image.jpg');
  let img = fm.readImage(path);
  return img;
};

const getLastMonday = () => {
  var prevMonday = new Date();
  prevMonday.setDate(prevMonday.getDate() - (prevMonday.getDay() + 6) % 7);
  prevMonday.setHours(0, 0, 0)
  parseInt(prevMonday.getTime() / 1000)

  return ({ MondayAsInt: parseInt(prevMonday.getTime() / 1000), prevMonday: prevMonday })
}

async function loadActivity(clientID, clientSecret, refreshToken, numberOfActivities) {
  try {
    const req = new Request(apiURL(clientID, clientSecret, refreshToken))
    req.method = "POST"
    let response = await req.loadJSON()
    const accessToken = response.access_token

    // Get data of latest activity, in this case just the ID
    const dataComplete = await new Request(callActivities + accessToken + `&per_page=${numberOfActivities}`).loadJSON()
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

  if (hasPhoto > 0) {
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
  let roundedDistance = num.slice(0, (num.indexOf(".")) + 3)

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
  let maxSpeedText = detailsStackSecondRow.addText("Max. " + maxSpeed + " km/h")
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

  if (hasPhoto > 0 && photoWidget) {
    const images = data.photos;

    //Get a photo from the activity
    const imgUrl = data.photos.primary.urls["600"];

    try {
      img = await loadImage(imgUrl)
      saveImage(img)
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

async function loadActivityFromLastNDays(clientID, clientSecret, refreshToken, numberOfActivities, after) {

  try {
    const req = new Request(apiURL(clientID, clientSecret, refreshToken))
    req.method = "POST"
    let response = await req.loadJSON()
    const accessToken = response.access_token
    // Get data of latest activity, in this case just the ID
    const dataComplete = await new Request(callActivities + accessToken + `&per_page=${numberOfActivities}` + `&after=${after}`).loadJSON()
    let summary = createSummaryFromActivies(dataComplete);

    const activityId = dataComplete[0].id

    // Get latest activity, complete dataset for images. Kinda annyoing...
    const callSingleActivity = `https://www.strava.com/api/v3/activities/`
    let latestActivity = await new Request(callSingleActivity + activityId + "?access_token=" + accessToken).loadJSON()
    // Save file to local
    saveStravaData({summary:summary, latestActivity:latestActivity})
    console.log('using online latestActivityData')
    return({summary:summary, latestActivity:latestActivity})

  } catch (e) {
    // If API is offline, use local data
    // TODO get saved summary data as well
    const offlineData = getSavedStravaData();
    console.log('using saved/offline data')
    return(offlineData)

  }
}

function getMinPerKilometer(moving_time_in_seconds, distance_in_meters) {
  let runPace = ((moving_time_in_seconds / 60) / (distance_in_meters / 1000))
  let runPaceStr = runPace ? `${String(parseInt(runPace)).padStart(2, '0')}:${((runPace % 1) * 60).toFixed(0).padStart(2, '0')}` : '00:00'
  return ({ runPace, runPaceStr })
}

function getKilometersPerHour(moving_time_in_seconds, distance_in_meters) {
  let kmh = (distance_in_meters / 1000) / (moving_time_in_seconds / (60 * 60))
  return ({ kmh: kmh, kmhStr: kmh ? kmh.toFixed(2) : '00:00' })
}

function getPacePer100m(moving_time_in_seconds, distance_in_meters) {
  let swimPace = ((moving_time_in_seconds / 60) / (distance_in_meters / 100))
  let swimPaceStr = swimPace ? `${String(parseInt(swimPace)).padStart(2, '0')}:${((swimPace % 1) * 60).toFixed(0).padStart(2, '0')}` : '00:00'
  return ({ swimPace, swimPaceStr })
}

function createSummaryFromActivies(activities) {

  // 1) CREATE SUMMARY FOR CURRENT WEEK
  let initialValue = 0
  let total_seconds_swim = activities.filter((act) => act.type == 'Swim').reduce((act, prevActs) => act + prevActs.moving_time, initialValue)
  let total_seconds_bike = activities.filter((act) => act.type == 'Ride').reduce((act, prevActs) => act + prevActs.moving_time, initialValue)
  let total_seconds_run = activities.filter((act) => act.type == 'Run').reduce((act, prevActs) => act + prevActs.moving_time, initialValue)
  let total_seconds_other = activities.filter((act) => act.type != "Run" && act.type != "Ride" && act.type != "Swim").reduce((act, prevActs) => act + prevActs.moving_time, initialValue)

  let total_meters_swim = activities.filter((act) => act.type == 'Swim').reduce((act, prevActs) => act + prevActs.distance, initialValue)
  let total_meters_bike = activities.filter((act) => act.type == 'Ride').reduce((act, prevActs) => act + prevActs.distance, initialValue)
  let total_meters_run = activities.filter((act) => act.type == 'Run').reduce((act, prevActs) => act + prevActs.distance, initialValue)
  let total_meters_other = activities.filter((act) => act.type != "Run" && act.type != "Ride" && act.type != "Swim").reduce((act, prevActs) => act + prevActs.distance, initialValue)

  // 2) CREATE DAILY SUMMARIES
  // create summary for each day in the current week
  // new Date().getDay() method starts with sunday with index = 0 -> Monday has index 1
  const weekLabels = ['S', 'M', 'D', 'M', 'D', 'F', 'S']
  const daily_summary = []
  for (let dayIndex = 0; dayIndex < weekLabels.length; dayIndex++) {
    let weekLabel = weekLabels[dayIndex];
    let actsPerDay = activities.filter((act) => new Date(act.start_date_local).getDay() == dayIndex)
    let daily_total_seconds = actsPerDay.reduce((act, prevActs) => act + prevActs.moving_time, 0)
    let daily_total_distance = actsPerDay.reduce((act, prevActs) => act + prevActs.distance, 0)
    let daily_total_sports = actsPerDay.map(act => act.type)
    
    let daily_sport_type_label;
    if(daily_total_sports[0]){
      daily_sport_type_label = (new Set(daily_total_sports).size) == 1 && daily_total_sports[0] ? daily_total_sports[0] : 'Multi'
    }

    daily_summary.push(
      {
        dayIndexUS: dayIndex,
        dayIndexDE: dayIndex == 0 ? 6 : dayIndex-1,
        weekLabel: weekLabel,
        dailyActivityCount: actsPerDay.length,
        daily_total_seconds: daily_total_seconds,
        daily_total_distance: daily_total_distance,
        daily_sport_type_label: daily_sport_type_label
      })
  }

  return ({
    total_seconds_swim: total_seconds_swim,
    total_seconds_bike: total_seconds_bike,
    total_seconds_run: total_seconds_run,
    total_seconds_other: total_seconds_other,

    total_meters_swim: total_meters_swim,
    total_meters_bike: total_meters_bike,
    total_meters_run: total_meters_run,
    total_meters_other: total_meters_other,

    mean_pace_swim: getPacePer100m(total_seconds_swim, total_meters_swim),
    mean_pace_bike: getKilometersPerHour(total_seconds_bike, total_meters_bike),
    mean_pace_run: getMinPerKilometer(total_seconds_run, total_meters_run),

    daily_summary: daily_summary
  })

}

// function definitions for medium widget
const normSummaryDataTo100Percent = (summary, MAX_Y) => {
  let maxSeconds = Math.max(...summary.daily_summary.map((a) => a.daily_total_seconds))
  let scale_factor = MAX_Y/maxSeconds;
  summary.daily_summary = summary.daily_summary.map( d => ({...d, scaled_daily_total_seconds: d.daily_total_seconds*scale_factor}));
  return(summary);
}

function createProgressBar(context, dayIndex, dayLabel, total_hrs_percent, sportType) {
  if (total_hrs_percent > 0) {
    context.setFillColor(new Color("#f7551f"))
  } else {
    context.setFillColor(new Color("#000"))
    total_hrs_percent = 1 //1%
  }

  const path = new Path()
  let rect_h = total_hrs_percent// = activity_hrs
  let rect_w = 15 // breite des bars
  let x = 105 + ((dayIndex + 1) * 25)
  let y = 100 - total_hrs_percent
  path.addRect(new Rect(x, y, rect_w, rect_h), 30, 20)
  context.addPath(path)
  context.fillPath()
  context.drawText(dayLabel, new Point(x + 1.25, y + rect_h + 1))
  if (sportType == 'Run') {
    let symRun = SFSymbol.named('figure.walk').image
    context.drawImageAtPoint(symRun, new Point(x, y - 25))
  } else if (sportType == 'Ride') {
    const symBike = SFSymbol.named('bicycle').image
    context.drawImageAtPoint(symBike, new Point(x - 7.5, y - 25))
  } else if (sportType == 'Swim') {
    const symSwim = SFSymbol.named('rays').image
    context.drawImageAtPoint(symSwim, new Point(x - 2.5, y - 25))
  } else if (total_hrs_percent > 1) {
    //TODO: other sports...
  }
}

function mainCreateMediumWidget(stravaScaledSummaryData) {
  const DEVICE_LANGUAGE = Device.language();
  const scaledSummaryData = stravaScaledSummaryData 

  // init context and widget
  const w = new ListWidget()
  w.backgroundColor = new Color("#ffffff")
  const context = new DrawContext()
  context.size = new Size(300, 115)
  context.opaque = false
  context.respectScreenScale = true

  // A) print weekly stats as a summary on the left
  context.setFont(Font.boldSystemFont(16))
  context.drawText(DEVICE_LANGUAGE == 'de' ? 'Statistik' : 'Statistics', new Point(0,-2.5))
  let rowY = -5
  // 1. Row: Swimming
  context.setFont(Font.regularSystemFont(11))
  const symSwim = SFSymbol.named('rays').image
  rowY += 25
  context.drawImageAtPoint(symSwim, new Point(0, rowY))
  context.drawText(`Σ ${scaledSummaryData.total_seconds_swim > 0 ? parseInt(`${scaledSummaryData.total_seconds_swim/60}`) : '-'} min`, new Point(32.5, rowY-2.5))
  context.drawText(`⌀ ${scaledSummaryData.mean_pace_swim.swimPaceStr} min/100m`,new Point(32.5, rowY + 12.5))
  
  // 2. Row: Bike
  context.setFont(Font.regularSystemFont(11))
  rowY += 35
  const symBike = SFSymbol.named('bicycle').image
  context.drawImageAtPoint(symBike, new Point(0, rowY))
  context.drawText(`Σ ${scaledSummaryData.total_seconds_bike > 0 ? parseInt(`${scaledSummaryData.total_seconds_bike/60}`) : '-'} min`, new Point(32.5, rowY-2.5))
  context.drawText(`⌀ ${scaledSummaryData.mean_pace_bike.kmhStr} km/h`,new Point(32.5, rowY + 12.5))
  
  // 3. Row: Run
  context.setFont(Font.regularSystemFont(11))
  rowY += 35
  const symRun = SFSymbol.named('figure.walk').image
  context.drawImageAtPoint(symRun, new Point(0, rowY))
  context.drawText(`Σ ${scaledSummaryData.total_seconds_run > 0 ? parseInt(`${scaledSummaryData.total_seconds_run/60}`) : '-'} min`, new Point(32.5, rowY-2.5))
  context.drawText(`⌀ ${scaledSummaryData.mean_pace_run.runPaceStr} min/km`,new Point(32.5, rowY + 12.5))


  // B) make bar chart from daily statistics
  context.setFont(Font.regularSystemFont(14))
  for (let index = 0; index < scaledSummaryData.daily_summary.length; index++) {
    let day = scaledSummaryData.daily_summary[index];
    createProgressBar(context, DEVICE_LANGUAGE == 'de' ? day.dayIndexDE : day.dayIndexUS, day.weekLabel, day.scaled_daily_total_seconds, day.daily_sport_type_label ? day.daily_sport_type_label : '')
  }
  // finalize drawings
  const img = context.getImage()
  const imgw = w.addImage(img)
  imgw.imageSize = new Size(300, 115)

  // run widget
  Script.setWidget(w)
  w.presentMedium()
  Script.complete()
}


//// MAIN
let clientID, clientSecret, refreshToken, data, miles, kmh, name, activityId, img;
const callActivities = `https://www.strava.com/api/v3/athlete/activities?access_token=`
let widgetInput = args.widgetParameter

if (widgetInput !== null) {
  [clientID, clientSecret, refreshToken] = widgetInput.split("|");

  if (!clientID || !clientSecret || !refreshToken) {
    throw new Error("Invalid parameter. Expected format: clientID|ClientSecret|RefreshToken")
  }

} else if(!config.runsInWidget){
  console.log("accessing secrets from file...");
  // create that file manually inside the scriptable folder, to be able to run the script from inside the scriptable app
  // strava-secret.json content:
  // {"clientID": "<your-client-id>", "clientSecret": "<your-client-secret>", "refreshToken": "<your-refresh-token>"}
  const {clientID, clientSecret, refreshToken} = getSavedStravaData('strava-secret.json')
  if (!clientID || !clientSecret || !refreshToken) {
    throw new Error('Invalid parameter. Expected text content: {"clientID": "<your-client-id>", "clientSecret": "<your-client-secret>", "refreshToken": "<your-refresh-token>"}')
  }
}
else {
  throw new Error("No parameters set. Please insert your parameters like this: clientID|ClientSecret|RefreshToken. Alternatively you can create a json file named 'strava-secret.json' inside the app folder")
}

const apiURL = (clientID, clientSecret, refreshToken) => `https://www.strava.com/oauth/token?client_id=${clientID}&client_secret=${clientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`

const numberOfActivities = 30 //always load 30 activities and the last one complete; config.widgetFamily != 'small' ? 30 : 1; // load only 1 activity for the small widget
const showLastNDays = 7

let {summary, latestActivity} = await loadActivityFromLastNDays(clientID, clientSecret, refreshToken, numberOfActivities, getLastMonday().MondayAsInt)
console.log(latestActivity);
console.log(summary);
// MAIN
// if(!config.runsInWidget){
if(config.widgetFamily == 'small'){
  let widget = await createWidget(latestActivity)
  widget.url = "strava://feed"
  Script.setWidget(widget)
  widget.presentSmall()
  Script.complete()
  console.log('this runs as small widget');
}

if(config.widgetFamily == 'medium' || !config.runsInWidget){
// if(!config.runsInWidget){
  const scaledSummaryData = normSummaryDataTo100Percent(summary, MAX_Y_HEIGHT);
  mainCreateMediumWidget(scaledSummaryData);
  console.log('this runs as medium widget');
}