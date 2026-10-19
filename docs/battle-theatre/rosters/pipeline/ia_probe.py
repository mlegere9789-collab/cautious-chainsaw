"""Polite IA advanced-search probe: for each source description print top identifiers (cached to ../cache/ia_probe.json)."""
import json, time, urllib.parse, urllib.request, sys

UA = 'gettysburg-map-research/1.0 (roster blueprint pilot; read-only, rate-limited)'
Q = {
    'PA Bates History of Pennsylvania Volunteers 1861-5': 'title:("history of pennsylvania volunteers") AND mediatype:texts',
    'NY Annual Report of the Adjutant General (muster rolls)': 'title:("annual report of the adjutant-general of the state of new york") AND mediatype:texts',
    'Official Army Register of the Volunteer Force': 'title:("official army register of the volunteer force") AND mediatype:texts',
    'Michigan Record of Service': 'title:("record of service of michigan volunteers") AND mediatype:texts',
    'Ohio Official Roster of the Soldiers': 'title:("official roster of the soldiers of the state of ohio") AND mediatype:texts',
    'Massachusetts Soldiers Sailors Marines': 'title:("massachusetts soldiers, sailors and marines in the civil war") AND mediatype:texts',
    'NJ Stryker Record of Officers and Men': 'title:("record of officers and men of new jersey in the civil war") AND mediatype:texts',
    'NH Revised Register Ayling': 'title:("revised register of the soldiers and sailors of new hampshire") AND mediatype:texts',
    'Vermont Revised Roster': 'title:("revised roster of vermont volunteers") AND mediatype:texts',
    'Connecticut Catalogue of Volunteer Organizations': 'title:("catalogue of connecticut volunteer organizations") AND mediatype:texts',
    'Indiana Report of the Adjutant General': 'title:("report of the adjutant general of the state of indiana") AND mediatype:texts',
    'Illinois Report of the Adjutant General': 'title:("report of the adjutant general of the state of illinois") AND mediatype:texts',
    'Minnesota in the Civil and Indian Wars': 'title:("minnesota in the civil and indian wars") AND mediatype:texts',
    'Maine at Gettysburg': 'title:("maine at gettysburg") AND mediatype:texts',
    'Pennsylvania at Gettysburg': 'title:("pennsylvania at gettysburg") AND mediatype:texts',
    'New York at Gettysburg': 'title:("new york at gettysburg") AND mediatype:texts',
    'Michigan at Gettysburg': 'title:("michigan at gettysburg") AND mediatype:texts',
    'Ohio at Gettysburg (Report)': 'title:("ohio at gettysburg") AND mediatype:texts',
    'Wisconsin Roster (found)': 'title:("roster of wisconsin volunteers") AND mediatype:texts',
    'Official Records Series I vol 27 Part 1 (found)': 'identifier:warofrebellion012701rootrich',
    'Official Records Series I vol 27 Part 2': 'identifier:warofrebellion012702rootrich',
    'Official Records Series I vol 27 Part 3': 'identifier:warofrebellion012703rootrich',
    'Confederate Georgia Roster Hillard': 'title:("roster of confederate soldiers of georgia") AND mediatype:texts',
    'Georgia Roster of the Confederate Soldiers 1861-1865': 'title:("confederate soldiers of georgia") AND mediatype:texts',
    'Louisiana Booth Records': 'title:("records of louisiana confederate soldiers") AND mediatype:texts',
    'Virginia Regimental history series (Howard)': 'title:("virginia regimental histories series") AND mediatype:texts',
    'Mississippi Confederate roster (Rowland)': 'title:("military history of mississippi") AND mediatype:texts',
    'Alabama roster (Owen Dictionary)': 'title:("history of alabama and dictionary of alabama biography") AND mediatype:texts',
    'South Carolina Confederate rosters': 'title:("confederate soldiers") AND title:("south carolina") AND mediatype:texts',
    'Texas Confederate rosters': 'title:("texas") AND title:("confederate") AND title:("roster") AND mediatype:texts',
    'Arkansas Confederate soldiers': 'title:("arkansas") AND title:("confederate") AND title:("soldiers") AND mediatype:texts',
    'Moore Roster NC vol 1': 'identifier:rosternorthcaro00moorgoog',
    'Confederate Military History': 'title:("confederate military history") AND mediatype:texts',
    'Soldiers National Cemetery Gettysburg report': 'title:("soldiers national cemetery") AND title:(gettysburg) AND mediatype:texts',
    'Hollywood Cemetery Richmond Confederate dead': 'title:("hollywood cemetery") AND mediatype:texts',
    'Heitman Historical Register': 'title:("historical register and dictionary of the united states army") AND mediatype:texts',
    'Dyer Compendium': 'title:("compendium of the war of the rebellion") AND mediatype:texts',
    'Phisterer New York in the War of the Rebellion': 'title:("new york in the war of the rebellion") AND mediatype:texts',
    'Busey Martin Regimental Strengths': 'title:("regimental strengths and losses at gettysburg")',
    'Gettysburg Brigade rosters Pa Reserve': 'title:("roster") AND title:("gettysburg") AND mediatype:texts',
    'Union medical hospital Gettysburg lists': 'title:("gettysburg") AND title:("wounded") AND title:("list") AND mediatype:texts',
    'List of Confederate dead Gettysburg Richmond Index (Gettysburg Confederate burials)': 'title:("confederate dead") AND mediatype:texts',
    'Confederate Muster rolls (Virginia Roster Soldiers)': 'title:("virginia") AND title:("muster") AND mediatype:texts',
}
out = {}
for k, q in Q.items():
    url = 'https://archive.org/advancedsearch.php?q=' + urllib.parse.quote(q) + '&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=date&fl%5B%5D=volume&fl%5B%5D=licenseurl&rows=6&output=json'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        d = json.load(urllib.request.urlopen(req, timeout=40))
        out[k] = [dict(id=x['identifier'], title=x.get('title', '')[:110], date=str(x.get('date', ''))[:10], vol=x.get('volume')) for x in d['response']['docs']]
        out[k + ' _numFound'] = d['response']['numFound']
    except Exception as e:
        out[k] = 'ERR ' + str(e)
    time.sleep(2.0)
json.dump(out, open('../cache/ia_probe.json', 'w'), indent=1)
for k, v in out.items():
    if k.endswith('_numFound'):
        continue
    print('##', k, '| numFound', out.get(k + ' _numFound'))
    if isinstance(v, list):
        for x in v[:4]:
            print('   ', x['id'], '|', x['title'], '|', x['date'], '|', x['vol'])
    else:
        print('   ', v)
