# Post-1863 structures documented by name, date and source (NOT generated from imagery).
# Each row: id, name, kind, built, removed (year, or None if standing in 2026), where, position (lon, lat, err) or None, sources.
# 'naip2013' is derived in build_modern_table.py from built/removed against the 2013-06-04 NAIP flight used as the base photograph.
from catalogue import R

ROWS = []


def M(name, kind, built, removed, where, pos, src, notes='', standing_2026=None):
    ROWS.append(dict(name=name, kind=kind, built=built, removed=removed, where=where, pos=pos, src=list(src), notes=notes, standing_2026=standing_2026))


# ----------------------------------------------------------------- visitor, museum and tourist structures
M('Cyclorama Building', 'museum', 1962, 2013, 'Ziegler\'s Grove / David Ziegler and Frey fields, Taneytown Road (125 Taneytown Rd)', None,
  [R('NPS-CLR-ROT1', 'Area 5 Defense of Cemetery Hill (Record of Treatment, p.192)', 'South of the former Visitor Center, in the battle-era David Ziegler and Frey fields, stood the Cyclorama Building, completed in 1962; the park demolished it in March 2013 and retained sections of its surface parking lot.'),
   R('HABS-PA', 'HABS Cyclorama Building, 125 Taneytown Road (https://www.loc.gov/item/pa3988/)', 'HABS record of the building and its site.')],
  notes='Demolished three months before the 2013-06-04 flight: the footprint and parking are bare ground in that photograph.', standing_2026=False)
M('Former Visitor Center (Rosensteel residence, 1921, enlarged early 1960s) and its parking lot', 'museum', 1921, 2009, 'immediately west of Taneytown Road, Cemetery Hill area', None,
  [R('NPS-CLR-ROT1', 'Area 5 (Record of Treatment)', 'The former Visitor Center, original portion built in the 1920s and expanded in the early 1960s, stood immediately west of Taneytown Road surrounded by surface parking; demolished in 2009, its parking lot in 2014.'),
   R('NPS-GMP-1999', 'Chapter on visitor facilities', 'The building was built as a residence in 1921 by George Rosensteel; NPS acquired it in 1971.')],
  notes='The building was gone before the 2013 flight; the parking lot (demolished 2014) was still present in it.', standing_2026=False)
M('Electric Map building', 'museum', None, None, 'adjacent to the Cyclorama Center', None,
  [R('NPS-GMP-1999', 'Visitor facilities', 'All NPS planning efforts through the 1999 GMP proposed to remove both the Electric Map and Cyclorama buildings.')],
  notes='Built date and demolition date are not in the sources read; UNKNOWN. Not counted in the 2013 flight table.', standing_2026=None)
M('Gettysburg National Tower (300 ft observation tower), gift shop, access roads and parking', 'tower', 1974, 2000, 'Baltimore Pike / Steinwehr corridor, on private land between the 1863 Beitler Field and Abraham Spangler Field 1', None,
  [R('NPS-CLR-ROT1', 'Area 8 (p.317-318 area note 2)', 'The National Gettysburg Battlefield Tower opened in 1974 between the 1863 Beitler Field and Abraham Spangler Field 1; the park acquired the 300-foot tower in 2000 and demolished it on 3 July 2000.'),
   R('NPS-CLR-ROT1', 'Chronology 2000', 'In July 2000 the park demolished the Gettysburg National Tower; in later months it removed the gift shop, roads and parking areas.')],
  notes='Absent from the 2013 photograph.', standing_2026=False)
M('Home Sweet Home Motel', 'motel', None, 2003, 'southern end of Steinwehr Avenue, across Emmitsburg/Taneytown corridor from the Cyclorama Building (Winebrenner Field)', None,
  [R('NPS-CLR-ROT1', 'Area 4 narrative (Record of Treatment, p.184)', 'In 2002 the Friends of the National Parks at Gettysburg purchased the Home Sweet Home Motel; the park demolished the motel complex the following year and rehabilitated the 1863 open character of Winebrenner Field.')],
  notes='Absent from the 2013 photograph.', standing_2026=False)
M('Battlefield Museum and Visitor Center (Gettysburg Foundation) and Ford Education Center', 'museum', None, None, 'Baltimore Pike / Taneytown Road, Cemetery Ridge rear', (-77.22596, 39.81151, 30),
  [R('NPS-GMP-1999', 'Proposal', 'The 1999 GMP proposed replacing the Visitor Center and Cyclorama Center with new facilities away from the Cemetery Hill core.'),
   R('OSM', 'relation 15013271 Gettysburg National Military Park Battlefield Museum and Visitor Center; node 3039715600 Ford Motor Company Fund Education Center', 'Named complex east of Taneytown Road; exact opening date is not stated in the sources read (it exists before the 2009 demolition of the old Visitor Center).')],
  notes='Standing in 2013 and 2026: must be removed from the base photograph.', standing_2026=True)

# ----------------------------------------------------------------- observation towers
M('Oak Ridge Observation Tower (steel, 1895-96, truncated to a platform in the 1960s)', 'tower', 1895, None, 'Oak Ridge, North Confederate Avenue / Doubleday Avenue', (-77.24188, 39.84407, 15),
  [R('NPS-CLI-LAND', 'Buildings and Structures: Designed Memorialization Period; NPS period', 'In 1895-96 five steel observation towers were erected at Ziegler\'s Grove, Big Round Top, Warfield Ridge, Oak Ridge and Culp\'s Hill; in the 1960s two were removed and the Oak Ridge tower was truncated; only the towers at Culp\'s Hill and Warfield Ridge remain entire.'),
   R('NPS-CLI-1CORPS', 'Oak Ridge Observation Tower #3 (Platform)', 'The Oak Ridge tower, now shortened to an elevated platform, is part of the commemorative park landscape.'),
   R('OSM', 'way 711733739 Oak Ridge Observation Tower', 'Mapped outline.')], standing_2026=True)
M("Culp's Hill observation tower (steel, 1895-96)", 'tower', 1895, None, "Culp's Hill summit", (-77.2205, 39.82012, 15),
  [R('NPS-CLI-LAND', 'Buildings and Structures: NPS period', "Only the towers at Culp's Hill and Warfield Ridge remain in their entirety."), R('OSM', "way 776492922 Culp's Hill Historic Lookout Tower", 'Mapped outline.')], standing_2026=True)
M('Warfield Ridge (Longstreet) observation tower (steel, 1895-96)', 'tower', 1895, None, 'Warfield Ridge, West Confederate Avenue', (-77.25602, 39.79992, 15),
  [R('NPS-CLI-LAND', 'Buildings and Structures: NPS period', 'Only the towers at Culp\'s Hill and Warfield Ridge remain in their entirety.'), R('OSM', 'way 711037074 Longstreet observation tower', 'Mapped outline.')], standing_2026=True)
M('Big Round Top and Ziegler\'s Grove steel observation towers (1895-96) and the two wooden towers of the 1870s', 'tower', 1870, 1960, 'Big Round Top summit; Ziegler\'s Grove; East Cemetery Hill', None,
  [R('NPS-CLI-LAND', 'Buildings and Structures', 'Two wooden observation towers were erected in the 1870s, on the summit of Big Round Top and on East Cemetery Hill; in 1895-96 they were replaced by five steel towers; two of the steel towers were removed in the 1960s.')],
  notes='Gone long before 2013; listed so that no tower is drawn on the 1863 base.', standing_2026=False)

# ----------------------------------------------------------------- First Day (north-west) sector
M('Peace Light Inn complex (1940), pond/quarry, and two houses along Mummasburg Road (c.1950)', 'inn', 1940, 1979, 'John Forney farm, Mummasburg Road / Buford Avenue (Forney Field 3 and 4)', None,
  [R('NPS-CLI-1CORPS', 'Forney Fields #3 and #4', 'Forney farmstead demolished 1937; Peace Light Inn complex built 1940; two houses built along Mummasburg Road c.1950; park acquired the field in 1976, the inn complex was demolished in 1979 and the two houses were removed in 1980 and 1990.')], standing_2026=False)
M('Mini-golf course on Mummasburg Road (1930)', 'amusement', 1930, None, 'Forney Field 3, Mummasburg Road', None,
  [R('NPS-CLI-1CORPS', 'Forney Fields #3', 'Mini-golf course built along Mummasburg Road, 1930.')], notes='Removal date not stated.', standing_2026=False)
M('Two houses at the south-east corner of Forney Field 2 (c.1925 and 1938)', 'house', 1925, 1991, 'Forney Field 2, North Confederate Avenue / Peace Memorial', None,
  [R('NPS-CLI-1CORPS', 'Forney Fields #2', 'South-eastern corner developed with two houses in c.1925 and 1938; houses removed in 1976 and 1991.')], standing_2026=False)
M('Oak Ridge Museum (c.1925), Susan Forney house (c.1885) and Gettysburg Airport buildings (1927-47)', 'museum', 1885, 1965, 'Forney Fields 5-8 / Wills Field 5, Oak Ridge', None,
  [R('NPS-CLI-1CORPS', 'Forney Fields #7; Wills Fields #5', 'Susan Forney house built at the NE corner of Field 7 c.1885; Oak Ridge Museum built c.1925, demolished c.1950; Susan Forney house demolished 1965; Gettysburg Airport 1927-47 with a farmhouse converted to an office, a hangar and a ticket booth (1927); buildings demolished 1948; the ticket booth foundation remains.')],
  notes='The ticket-booth foundation is the only remnant and is classed non-contributing by NPS.', standing_2026=False)
M('Shields Museum and tourist cabins (c.1922)', 'museum', 1922, 1989, 'McPherson Field 7, near the Buford statue', None,
  [R('NPS-CLI-1CORPS', 'McPherson Farm Fields #7', 'Eastern part developed as Shields Museum and tourist cabins in c.1922, acquired by the park in 1985, development removed 1989.')], standing_2026=False)
M('Riding-ring stable building (1952), Gettysburg Country Club golf course structures (pavilion, comfort station, bridges, culverts)', 'stable', 1952, 2011, 'Harman farm / McPherson Field 1, west of Willoughby Run', None,
  [R('NPS-CLI-1CORPS', 'McPherson Farm Fields #1; Herr\'s Ridge', 'Stable building built 1952 within the Harman farm and demolished after NPS acquisition in 2011; golf-course bridges, culverts and a pavilion/comfort-station pumphouse remnant are non-contributing and incompatible.')],
  notes='The golf course and its structures are other layers; listed here for the buildings.', standing_2026=None)
M('Springs Hotel (1869) and Katalysine Spring buildings (1868-c.1875), 1935 bottling works', 'hotel', 1868, None, 'Medicinal Katalysine Spring, Herr\'s Ridge / McPherson Field 2', None,
  [R('NPS-CLI-LAND', 'Buildings and Structures', 'The Katalysine Springs Hotel was constructed in 1868.'),
   R('NPS-CLI-1CORPS', 'Katalysine Spring Building Sites', 'The exact location and size of the spring buildings remain unknown; underground pipes ran to the Springs Hotel (1869) and a 1935 bottling works.'),
   R('NPS-CLI-1CORPS', 'Chronology of the 1st Corps area', 'The Springs Hotel complex declined and was eventually demolished.')],
  notes='Locations UNKNOWN; a granite-lined collection box (1868) survives.', standing_2026=None)
M('West End Contact (Guide) Station (1936, WPA)', 'guide_station', 1936, None, 'McPherson Field 3a, north-east corner, Chambersburg Pike', (-77.25231, 39.83799, 40),
  [R('NPS-CLI-1CORPS', 'West End Contact Station', 'The station does not contribute to the significance of the park; the building is eligible for the National Register for its WPA association.'),
   R('OSM', 'way 711545189 Guide Station Drive', 'The OSM road name places the station at the north end of Guide Station Drive.')], standing_2026=True)

# ----------------------------------------------------------------- tourism around Little Round Top and Emmitsburg Road
M('Round Top Park complex (1885): Round Top schoolhouse (brick, 1889), picnic area, dance hall, Rosensteel Ice House, Wheatfield Road carriage house (c.1890); Roundtop Museum', 'tourist_complex', 1885, 1933, 'Wheatfield Road / Taneytown Road north-east of Little Round Top', None,
  [R('NPS-CLI-LRT', 'Chronology and Commemoration Era', 'In 1884-85 the railway spur ended at Round Top Park, a picnic area; John Rosensteel opened the Round Top Museum in 1885 NE of the Wheatfield / Sedgwick Avenue intersection, built a carriage house about 1890 beside a brick schoolhouse of 1889; by 1933 Round Top Park, the museum, Tipton Park, Weikert\'s relic shop and the trolley line were gone.'),
   R('NPS-CLI-LAND', 'Buildings and Structures: Round Top Park', 'The complex included the schoolhouse, picnic area, dance hall, Rosensteel Ice House and Wheatfield Road carriage house.')], standing_2026=False)
M('Tipton Park (photographer\'s studio and refreshment stand) and Weikert relic shop', 'tourist_complex', 1890, 1933, 'Devil\'s Den; between the two Round Tops', None,
  [R('NPS-CLI-LRT', 'Commemoration Era', 'William Tipton bought land in the Devil\'s Den area for a refreshment stand and photography studio; David Weikert ran a small relic shop between the Round Tops; both gone by 1933.')], standing_2026=False)
M('"Pinch Gut" roadside development (houses, restaurants, ice-cream parlor, motel, tourist cabins), Emmitsburg Road / West Confederate Avenue', 'commercial_strip', 1863, None, 'Emmitsburg Road at West Confederate Avenue (Peach Orchard south)', None,
  [R('NPS-CLI-LAND', 'Buildings and Structures: later periods', 'At the crossing of Emmitsburg Road and West Confederate Avenue, nicknamed Pinch Gut, two houses were built in the period 1863-1895, two restaurants and three residences between 1895 and 1933, and in the NPS period an ice-cream parlor, motel and tourist cabins; Pinch Gut then expanded and was removed as the NPS removed buildings with no connection to the battle.')],
  notes='Removal dates not stated; in the sources read these buildings are described as removed.', standing_2026=False)
M('Fantasyland amusement park buildings', 'amusement', None, None, 'east of Taneytown Road, south of the Visitor Center area', None,
  [R('NPS-GMP-1999', 'Management prescriptions; development concept discussion', 'Unused non-historic structures such as the Fantasyland amusement park buildings are non-contributing; a complex in the old Fantasyland amusement park east of Taneytown Road was proposed for park use.')], notes='Dates UNKNOWN.', standing_2026=None)
M('Camp Colt (1917-18 infantry and tank training camp) and the World War II German POW camp on the Codori farm', 'camp', 1917, None, 'Emmitsburg Road / Codori farm and Cemetery Ridge', None,
  [R('NPS-CLI-PICKETT', 'Camp Colt section, Figure 14 caption', 'In 1917-1918 an infantry and tank training camp (Camp Colt) was active; the 1917 panorama shows tents on the fields along the Emmitsburg Road.'),
   R('NPS-CLI-LAND', 'NPS period, World War II', 'A German POW camp was established on the Codori farm, later moved to the CCC camp; at the end of the war these camps were removed and the sites restored.')], notes='Temporary camps; removal dates beyond the war years not stated.', standing_2026=False)

# ----------------------------------------------------------------- NPS park structures still standing
M('Roller Building maintenance complex (War Department 1890s core, enlarged 1960s), guard stations, comfort stations, entrance stations', 'maintenance', 1895, None, 'maintenance area, Taneytown Road corridor; guard stations at Culp\'s Hill, East Cavalry Field and West Confederate Avenue', None,
  [R('NPS-CLI-LAND', 'Buildings and Structures: Designed Memorialization and NPS periods', 'The War Department built a maintenance facility (Roller Building), Washington Street stables, guard stations and a comfort station near the Pennsylvania Memorial; the NPS enlarged the maintenance facility and built three comfort stations and entrance stations in the 1960s; the War Department guard stations were removed.')],
  notes='Only the structures still standing in 2013 need to be removed from the base photograph; positions come from the modern inventory.', standing_2026=True)
M('Pitzer\'s Woods amphitheater and McMillan Woods picnic shelter; CCC camp remains and McMillan Woods Group Campground (chimney, pavilion, storage shed)', 'park_facility', 1934, None, "Pitzer's Woods and McMillan Woods, Confederate Avenue", None,
  [R('NPS-CLI-LAND', 'NPS Stewardship Period', 'The NPS built an amphitheater in Pitzer\'s Woods and a picnic shelter in McMillan Woods; all still exist.'),
   R('NPS-CLI-PICKETT', 'McMillan Woods Group Campground entries', 'Stone chimney of a razed CCC/POW-camp building, pavilion and storage shed at the group campground; noncontributing.')], standing_2026=True)
M('Residences along West Confederate Avenue, Taneytown Road, Emmitsburg Road, Mummasburg Road and Doubleday Avenue; Ford garage on the first-day field', 'house', 1925, None, 'various', None,
  [R('NPS-CLI-LAND', 'NPS Stewardship Period', 'New residences, especially fronting Taneytown Road, Emmitsburg Road, Mummasburg Road, Baltimore Pike, Doubleday Avenue and West Confederate Avenue, and commercial facilities such as the Ford garage on the first day battlefield, were built after the period of significance.')],
  notes='Covered individually by the county building outlines (see the building class counts).', standing_2026=True)

# ----------------------------------------------------------------- Soldiers' National Cemetery (not present in July 1863)
M("Soldiers' National Cemetery (original 17-acre section, designed by William Saunders 1863, completed in large part 1869) with lodge (1864), enclosure wall (1865), Soldiers' National Monument and later buildings", 'cemetery', 1863, None,
  "Cemetery Hill, between Evergreen Cemetery (1854) and the Baltimore Pike / Taneytown Road", None,
  [R('NPS-CLI-CEM', 'Introduction and Buildings and Structures history', "The original 17-acre cemetery opened for burials in 1863 and was designed by William Saunders in 1863 and completed in large part by 1869; the granite lodge was built in 1864, the granite enclosure wall in 1865 and Soldiers' National Monument followed; Evergreen Cemetery (established 1854) was the adjoining cemetery that existed in July 1863."),
   R('NPS-CLI-CEM', 'Buildings and Structures: later changes', 'Lodge porches and mansard roof 1868; frame barn c.1868; kitchen building 1875 (demolished 1907); gun-storage building 1873 and barn demolished 1890 for a brick garage; rostrum 1879; summerhouse 1881; New York State Monument 1893; Lincoln Address Memorial 1912; new lodge 1907; 5-acre annex from 1968.')],
  notes='The Soldiers\' National Cemetery did not exist on 1-3 July 1863: the graves, drives, walls, lodge and monuments of the original section are all later. Evergreen Cemetery (1854) and its 1855 gatehouse did exist and are kept.', standing_2026=True)
