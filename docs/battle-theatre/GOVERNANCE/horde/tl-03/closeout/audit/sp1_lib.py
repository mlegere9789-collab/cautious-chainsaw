HR = r"(?:\d{1,2}(?:\.\d{2})? ?[ap]\. ?m\.?|o.clock|noon)"
SPECS = [
 {'rows': 'T1-116', 'scope': 'lib', 'pat': '(?:Mechanicstown).{0,300}(?:July 1|1st of July|first of July|July 2)', 'ids': 'HALL-6NYCAV-1908,CHENEY-1901,HARD-1868,IL-MON-1892,PA-GB-1914-v2,PA-GB-1914-v1,NY-GB-1900,NY-GB-1902-v3', 'note': 'Merritt Reserve Brigade at Mechanicstown on Jul 1, regimental histories', 'max': 3},
 {'rows': 'T1-119', 'scope': 'lib', 'pat': "Herr'?s?(?: Ridge| Hill|'s Ridge)", 'note': 'the name Herr Ridge, earliest attestation in the library', 'max': 2, 'libmax': 6},
 {'rows': 'T1-124', 'scope': 'lib', 'pat': '(?:General )?Lee.{0,120}(?:arrived|reached|rode up|came upon|appeared).{0,160}(?:Gettysburg|the field|Seminary).{0,200}(?:o.clock|p\\. ?m)', 'ids': 'ALEXANDER-1907,LONGSTREET-1896,FREMANTLE-1864,SHSP-04,SHSP-06,MEADE-LL-v2,BL-3,BIDDLE-1880,BATES-1875,PA-GB-1914-v2,PA-GB-1904', 'note': "hour of Lee's arrival on Jul 1, library", 'max': 3},
 {'rows': 'T1-128', 'scope': 'lib', 'pat': "Blocher'?s? (?:Knoll|Hill)|Barlow'?s? (?:Knoll|Hill)", 'note': "the names Blocher's and Barlow's Knoll in the library", 'max': 2, 'libmax': 6},
 {'rows': 'T1-129', 'scope': 'both', 'pat': 'Iverson.{0,300}(?:1,[0-9]{3}|1[0-9]{3}) ?(?:men|strong|muskets|effective|officers)', 'note': "strength of Iverson's brigade", 'max': 3, 'libmax': 6},
 {'rows': 'T1-132', 'scope': 'lib', 'pat': '(?:cloudy|overcast|thunder-?shower|drizzl|clear and warm|warm and clear).{0,120}(?:first day|July 1|1st of July|Wednesday)', 'ids': 'JACOBS-1888,JACOBS-1864,TPIERCE-1889,FREMANTLE-1864,BL-3,PA-GB-1914-v2,NY-GB-1900', 'note': 'cloud cover or weather of Jul 1, diaries and memoirs', 'max': 3},
 {'rows': 'T1-132', 'scope': 'lib', 'pat': 'thermometer|Fahrenheit|degrees? (?:above|in the shade)', 'ids': 'JACOBS-1888,JACOBS-1864', 'note': 'thermometer readings in Jacobs (1864 and the 1888 reprint)', 'max': 6},
 {'rows': 'T1-135', 'scope': 'lib', 'pat': 'First Corps.{0,300}hospital.{0,300}(?:seminary|college|court.house|church)', 'ids': 'LETTERMAN-1866,HOSPSCENES-1864,BARTON-ANGELS-1898,USCC-SMITH-1868,TPIERCE-1889,JACOBS-1864', 'note': 'First Corps hospitals in the town', 'max': 3},
 {'rows': 'T1-137', 'scope': 'lib', 'pat': 'post.and.rail.{0,250}(?:Chambersburg|McPherson|pike|Herr)', 'note': 'post-and-rail fences along the Chambersburg pike', 'max': 2, 'libmax': 8},
 {'rows': 'T1-138', 'scope': 'lib', 'pat': 'McMillan.{0,300}(?:fence|rails)', 'note': 'a McMillan neighbour felling fences', 'max': 2, 'libmax': 8},
 {'rows': 'T1-139', 'scope': 'lib', 'pat': '(?:fifteen|sixteen|fourteen|years of age|my age|years old|fifteenth year)', 'ids': 'TPIERCE-1889', 'note': "Tillie Pierce's age in her memoir", 'max': 6},
 {'rows': 'T1-140', 'scope': 'lib', 'pat': 'Spangler.{0,300}(?:1,[0-9]00|2,000|hospital)', 'note': 'Spangler farm hospital, wounded counts', 'max': 2, 'libmax': 8},
]
