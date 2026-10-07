// tools/scenes.mjs - the scene list of the brief (S1 to S8) and the helpers that put the page into each one.  Real data only: units, positions, events and stories come from the dataset the page carries.
// A scene is { id, file, vp, dpr, tick, zoom, lat, lng, popups: false | true | 'event+story' | 'legend' | 'hover' | 'select' ..., select, hover, rail }.
export const HOT = {
  field: { lat: 39.81592, lng: -77.23677 }, angle: { lat: 39.8117, lng: -77.2347 }, wheat: { lat: 39.7992, lng: -77.2414 }, cemhill: { lat: 39.8189, lng: -77.2262 }, herbst: { lat: 39.8278, lng: -77.2528 },
};
export const SCENES = [
  { id: 's1a', file: 's1a-field-z13.5-tick551.png', title: 'S1a  Opening view, the whole field at the site start zoom, tick 551 (the tick the first prototype used for compare-z15)', tick: 551, zoom: 13.5, ...HOT.field, popups: false },
  { id: 's1b', file: 's1b-assault-z13.5-tick556.png', title: 'S1b  The Day 3 assault, whole field, tick 556', tick: 556, zoom: 13.5, ...HOT.field, popups: false },
  { id: 's1c', file: 's1c-angle-z15-tick556.png', title: 'S1c  The Angle at zoom 15, tick 556 (the densest hotspot)', tick: 556, zoom: 15, ...HOT.angle, popups: false },
  { id: 's2', file: 's2-wheatfield-rosewoods-z15-tick293.png', title: 'S2  The Wheatfield and Rose Woods, zoom 15, tick 293', tick: 293, zoom: 15, ...HOT.wheat, popups: false },
  { id: 's3', file: 's3-cemetery-hill-z15.5-tick346.png', title: 'S3  Cemetery Hill, zoom 15.5, tick 346', tick: 346, zoom: 15.5, ...HOT.cemhill, popups: false },
  { id: 's4', file: 's4-close-selected-inspect-z16.5.png', title: 'S4  Close-up at zoom 16.5, one unit selected, the Inspect card open', tick: 556, zoom: 16.5, ...HOT.angle, popups: 'select', keep: ['unit-card', 'clock-hud'] },
  { id: 's5', file: 's5-phone-z14.5-sheet.png', title: 'S5  Phone 390x844, zoom 14.5, the bottom sheet', tick: 556, zoom: 14.5, ...HOT.angle, vp: [390, 844], popups: 'select-sheet', keep: ['unit-card'] },
  { id: 's6', file: 's6-event-and-story-in-situ.png', title: 'S6  An event card and a story card in situ', tick: 28, zoom: 14.5, ...HOT.herbst, popups: 'event+story' },
  { id: 's7', file: 's7-legend.png', title: 'S7  The legend', tick: 551, zoom: 15, ...HOT.angle, popups: 'legend', keep: ['legend', 'clock-hud'] },
  { id: 's8', file: 's8-hover-tooltip.png', title: 'S8  A hover tooltip', tick: 556, zoom: 16, ...HOT.angle, popups: 'hover', keep: ['unit-card', 'clock-hud'] },
  { id: 's9', file: 's9-day-banner-and-clock.png', title: 'S9  The day banner and the clock: the clock lands on tick 226, the start of Day 2 (the scene starts at tick 200 so that the landing raises the banner)', tick: 200, zoom: 12.5, ...HOT.field, popups: 'js', keep: ['day-banner', 'clock-hud'], js: "st.host.preview('day-banner'); window.__adv(90, 20);" },
  { id: 's10', file: 's10-narration-welcome.png', title: 'S10  The narration card (the welcome)', tick: 28, zoom: 14, ...HOT.herbst, popups: 'js', keep: ['clock-hud'], js: `st.showWelcome(); st.updateSafe(); e.moveTo({ lat: ${HOT.herbst.lat}, lng: ${HOT.herbst.lng}, zoom: 14 }, { glide: false, safe: true }); window.__adv(60, 20);` },
  { id: 's11', file: 's11-auto-tour-in-the-reading-panel.png', title: 'S11  The Auto tour in the reading panel (Little Round Top)', tick: 260, zoom: 14.5, lat: 39.7956, lng: -77.2411, popups: 'js', keep: ['tour', 'clock-hud'], js: "[...document.querySelectorAll('.pop-tb')].find((b) => b.textContent === 'Auto tour').click(); window.__adv(40, 20); st.host.act('tour:tour', 'goto:4'); window.__adv(260, 20);" },
  { id: 's12', file: 's12-chronicle-in-the-reading-panel.png', title: 'S12  The Chronicle of moments so far, in the reading panel', tick: 120, zoom: 14, ...HOT.angle, popups: 'js', keep: ['chronicle', 'clock-hud'], js: "st.host.key('c'); window.__adv(80, 20);" },
];
