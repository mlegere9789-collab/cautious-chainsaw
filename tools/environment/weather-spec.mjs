// Hand-curated specification of data-src/environment/weather_by_day.json. Everything here is a CLAIM that build-weather.mjs and validate.mjs then check
// against the cached source texts: each quote must be found on the stated leaf of the stated scan(s), each number must be re-extracted from its quote,
// and each reading is compared across the independent witnesses. Nothing in this file is evidence by itself.

// ---------------------------------------------------------------- the three 1864 scans of Jacobs's Notes (the 1888 fifth edition is NOT used)
export const NOTES_COPIES = [
  { id: 'A', ia: 'notesonrebelinva00jaco', kind: 'abbyy', holder: 'Lincoln Financial Foundation Collection (scanned for the Indiana State Library, IMLS LSTA grant)', pages_in_scan: 'front matter + pp. 1-47', min_page: 0, max_page: 47 },
  { id: 'B', ia: 'notesonrebelinva00gett', kind: 'abbyy', holder: 'Musselman Library, Special Collections, Gettysburg College (Lyrasis/Sloan)', pages_in_scan: 'front matter + pp. 1-47', min_page: 0, max_page: 47 },
  { id: 'C', ia: 'notesonrebelinv00jacogoog', kind: 'abbyy', holder: 'University of Michigan, digitised by Google', pages_in_scan: 'front matter + pp. 1-43 only (45 leaves: pp. 44-47 are missing from this copy)', min_page: 0, max_page: 43 },
];

// Quotes from the 1864 Notes. text = verbatim (spelling and punctuation as printed, line-break hyphens joined); page = printed page of copy A (all three copies share pagination).
export const NOTES_QUOTES = [
  { id: 'Q-N-hdr-jun26', page: 14, date: '1863-06-26', text: 'Friday, June 26.', role: 'dating heading', note: 'The paragraph about the heavy rain of the night (Q-N-rain-jun25) is the last before this heading, so it is Thursday June 25.' },
  { id: 'Q-N-rain-jun25', page: 14, date: '1863-06-25', text: 'But the heavy rain of that night caused them to be detained until the balance of the regiment arrived', role: 'weather remark', element: 'precipitation' },
  { id: 'Q-N-wet-jun26', page: 16, date: '1863-06-26', text: 'Being wet from the rain which had fallen during the most of the day, and considerably heated by a long march, there was found, by a person near them as they passed, to have been more truth than fiction in the remark of a friend, that "the air was filled with the filthy exhalations from their bodies."', role: 'weather and smell remark about a marching Confederate brigade, NOT about the battlefield', element: 'precipitation' },
  { id: 'Q-N-early-fri', page: 16, date: '1863-06-26', text: 'General Early, who accompanied this brigade, and remained in town over Friday night', role: 'dating evidence for Q-N-wet-jun26', note: 'Friday night is the night of June 26; the "wet from the rain" passage is on the page before it and describes the same brigade.' },
  { id: 'Q-N-hdr-jul2', page: 30, date: '1863-07-02', text: 'Thursday, July 2.', role: 'dating heading' },
  { id: 'Q-N-sunset-jul2', page: 31, date: '1863-07-02', text: 'at about sunset came the Sixth corps', role: 'time-of-day reference (sun)', element: 'sun_reference' },
  { id: 'Q-N-morning-jul2', page: 32, date: '1863-07-02', text: 'The morning was pleasant, the air was calm, the sun shone mildly through a smoky atmosphere, and the whole outer world was quiet and peaceful', role: 'weather remark (morning of July 2)', element: 'sky' },
  { id: 'Q-N-dark-jul2', page: 36, date: '1863-07-02', text: 'The enemy came up under cover of the forest and approaching darkness', role: 'time-of-day reference (dusk)', element: 'sun_reference' },
  { id: 'Q-N-dawn-jul3', page: 40, date: '1863-07-03', text: 'At the dawn of day our artillery opened upon the Rebels', role: 'time-of-day reference (dawn)', element: 'sun_reference' },
  { id: 'Q-N-sunrise-jul3', page: 40, date: '1863-07-03', text: 'At sunrise this was followed by a general infantry attack', role: 'time-of-day reference (sunrise)', element: 'sun_reference' },
  { id: 'Q-N-cannonade-jul3', page: 41, date: '1863-07-03', text: 'At seven minutes past 1 p. m., the awful and portentous silence was broken.', role: 'clock time of the opening of the cannonade (not weather)', element: 'clock_reference' },
  { id: 'Q-N-thunder-simile', page: 41, date: '1863-07-03', text: 'such as were never equalled by the most terrific thunder-storm ever witnessed by mortal man', role: 'SIMILE for the noise of the guns, not a weather observation', element: 'simile' },
];

// ---------------------------------------------------------------- the 1885 article: the real source of the readings
export const ARTICLE_1885 = {
  id: 'jacobs-meteorology-1885',
  title: 'Meteorology of the Battle. Notes by Rev. Dr. Jacobs.',
  author: 'Henry Eyster Jacobs (signed "H. E. J."), reporting the readings of his father Michael Jacobs',
  publication: 'The Star and Sentinel (Gettysburg, Pa.), "For the Star and Sentinel", letter signed Gettysburg, July 30, 1885',
  issue_date_reported: '1885-08-11',
  issue_date_basis: 'Emerging Civil War (2023) captions its image of the clipping "Star and Sentinel (Gettysburg, PA), August 11, 1885"; not verified against an issue (the Library of Congress lists the title as not digitised, and no scan was located); page and column UNKNOWN.',
  rx: { url: 'http://civilwarrx.blogspot.com/2013/07/gettysburg-meteorology-of-battle.html', cache: 'civilwarrx-gettysburg-meteorology.html', name: 'Civil War Rx, "Gettysburg: Meteorology of the Battle", posted 2013-07-24 (Carole Adrienne)' },
  ecw: { url: 'https://emergingcivilwar.com/2023/02/22/the-thunder-seemed-tame-weather-at-the-battle-of-gettysburg/', cache: 'ecw-thunder-seemed-tame.html', name: 'Emerging Civil War, "The thunder seemed tame: Weather at the Battle of Gettysburg", Jon Tracey, 2023-02-22' },
  ecw_image: { url: 'https://emergingcivilwar.com/wp-content/uploads/2023/02/weather-clipping.png', cache: 'ecw-weather-clipping.png', name: "ECW's image of the 1885 clipping (July 1-8 passage), 291 x 725 px" },
};

// Quotes from the 1885 article as typed in the Civil War Rx transcription (witness "rx"); spelling, spacing and OCR-like slips are the transcription's own.
export const ARTICLE_QUOTES = [
  { id: 'Q-H-clear', text: 'From June 15th until July 22nd, 1863, there was not an entirely clear day.', element: 'sky', date: null },
  { id: 'Q-H-rain-start', text: 'June 25th, at 8 p. m., a rain began', element: 'precipitation', date: '1863-06-25' },
  { id: 'Q-H-rain-total', text: 'This rain continued at intervals until Saturday, June 27th, at 7 a. m., the precipitation being in inches 1, - 280.', element: 'precipitation', date: '1863-06-26', note: 'The figure is garbled in the transcription ("1, - 280"); read as 1.280 inches by analogy with the later figures "1.390" and "1.300"; the clipping image does not cover this paragraph.' },
  { id: 'Q-H-sky-jun27-29', text: 'At all the observations made on Saturday and Sunday, and until the nine o\'clock observation of Monday night, the entire sky was covered with clouds.', element: 'sky', date: '1863-06-27' },
  { id: 'Q-H-sky-jun30', text: 'On the day before the battle, both at 7 a. m., and 2 p. m., the obscuration was again complete, with cumulo-stratus clouds moving from S.S.E. At 9 p. m., only four-tenths of the heavens were covered.', element: 'sky', date: '1863-06-30' },
  { id: 'Q-H-wind-calm', text: 'During these days of sombre suspense, the records of the wind are those of almost an entire calm.', element: 'wind', date: '1863-06-30' },
  { id: 'Q-H-t-jun25', text: 'June 25th, 59 51 63', element: 'temperature', date: '1863-06-25' },
  { id: 'Q-H-t-jun26', text: '26th, 60 63 62', element: 'temperature', date: '1863-06-26' },
  { id: 'Q-H-t-jun27', text: '27th 61 63 67', element: 'temperature', date: '1863-06-27' },
  { id: 'Q-H-t-jun28', text: '28th 63 67 68', element: 'temperature', date: '1863-06-28' },
  { id: 'Q-H-t-jun29', text: '29th 66 72 69', element: 'temperature', date: '1863-06-29' },
  { id: 'Q-H-t-jun30', text: '30 68 79 71', element: 'temperature', date: '1863-06-30' },
  { id: 'Q-H-d1-text', text: 'FIRST DAY.-All through the first day, the entire sky was covered with clouds, viz: cumulo-stratus at 7 a. m. and 2 p. m.; and cirro-stratus at 9 p. m. A very gentle southern breeze, (2 miles per hour).', element: 'sky+wind', date: '1863-07-01' },
  { id: 'Q-H-t-jul1', text: 'Thermometer: 7 A.M. 2 P.M. 9 P.M. 72 76 74', element: 'temperature', date: '1863-07-01' },
  { id: 'Q-H-d2-text', text: 'SECOND DAY.-At 8 a. m., sky still covered, (cumulo-stratus). At 2 p. m., three-tenths are clear. At 9 p. m., there are cirrus clouds; wind as on preceding day.', element: 'sky+wind', date: '1863-07-02' },
  { id: 'Q-H-t-jul2', text: 'Thermometer: 7 A.M. 2 P.M. 9 P.M. 74 81 76', element: 'temperature', date: '1863-07-02' },
  { id: 'Q-H-d3-text', text: 'THIRD DAY.-At 8 a. m., sky again completely covered with cumulo-stratus clouds; at 2 p. m., only four-tenths of the heavens are covered, but with cumulus or the massive thunder-cloud of summer; at 9 p. m., seven-tenths cumulus. Wind S. S. W., very gentle.', element: 'sky+wind', date: '1863-07-03' },
  { id: 'Q-H-thunder', text: 'Thunder storm in neighborhood at 6 p. m. The thunder seemed tame, after the artillery firing of the afternoon.', element: 'thunder', date: '1863-07-03' },
  { id: 'Q-H-t-jul3', text: 'Thermometer: 7 A.M. 2 P.M. 9 P.M. 73 87 76', element: 'temperature', date: '1863-07-03' },
  { id: 'Q-H-d4-text', text: 'SATURDAY, THE FOURTH.-Rain in showers at 6 a. m., from 2:15 to 4 p. m., and at 4 a. m. of the 5th, aggregating 1.390.', element: 'precipitation', date: '1863-07-04' },
  { id: 'Q-H-t-jul4', text: 'Thermometer: 7 A.M. 2 P.M. 9 P.M. 69 72 70', element: 'temperature', date: '1863-07-04' },
  { id: 'Q-H-after', text: 'There were slight showers on the 5th and 7th; and on the 8th, a rain from 3 a. m. to 11:30 a. m., which measured 1.300.', element: 'precipitation', date: '1863-07-05' },
  { id: 'Q-H-max', text: 'The maximum temperature for the month of July 1863, was 87(, at the time of Pickett\'s charge. Eleven days of the month, the maximum was in the seventies, and on one day (17th) it was but sixty-two.', element: 'temperature', date: '1863-07-03', note: 'The degree sign is printed as a small raised circle (the transcription renders it "(").' },
];
