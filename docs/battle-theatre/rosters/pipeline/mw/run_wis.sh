#!/bin/bash
W=../../../../../tmp/library/rosters/MW
cmd //c "start /low /wait /b python -I -X utf8 wis_gen.py $W\wis1.pages.json 363 396 2WI $W\work\wis2nd.json"
cmd //c "start /low /wait /b python -I -X utf8 wis_gen.py $W\wis1.pages.json 403 454 3WI $W\work\wis3rd.json"
cmd //c "start /low /wait /b python -I -X utf8 wis_gen.py $W\wis1.pages.json 455 487 5WI $W\work\wis5th.json"
cmd //c "start /low /wait /b python -I -X utf8 wis_gen.py $W\wis1.pages.json 556 594 7WI $W\work\wis7th.json"
cmd //c "start /low /wait /b python -I -X utf8 wis_gen.py $W\wis2.pages.json 323 350 26WI $W\work\wis26th.json"
