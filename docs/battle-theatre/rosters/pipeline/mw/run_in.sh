#!/bin/bash
W=../../../../../tmp/library/rosters/MW
cmd //c "start /low /wait /b python -I -X utf8 tab_gen.py IN $W\reportindiana04dougrich.pages.json 281 298 14IN $W\work\in14.json"
cmd //c "start /low /wait /b python -I -X utf8 tab_gen.py IN $W\reportindiana04dougrich.pages.json 398 418 19IN $W\work\in19.json"
cmd //c "start /low /wait /b python -I -X utf8 tab_gen.py IN $W\reportindiana04dougrich.pages.json 419 439 20IN $W\work\in20.json"
cmd //c "start /low /wait /b python -I -X utf8 tab_gen.py IN $W\reportindiana04dougrich.pages.json 621 636 27IN $W\work\in27.json"
cmd //c "start /low /wait /b python -I -X utf8 tab_gen.py IN $W\reportindiana05dougrich.pages.json 397 419 3INCAV $W\work\in3cav.json"
