#!/bin/bash
cd /home/user/cautious-chainsaw/tmp/tl-01/run5
c() { out="crops/$1.jpg"; shift; PAD="$1" python3 -I crop5.py "$2" "$3" "$4" "$5" "$out" 2>&1 | tail -2; sleep 1.3; }
c star0627p2 500 sn83045462 1863-06-27 2 "train of thirteen freight cars"
c dnl0629p3 500 sn83026172 1863-06-29 3 "train of thirteen freight cars"
c cht0629p1 500 sn84031490 1863-06-29 1 "train of sixteen freight cars"
c tri0629a 450 sn83030213 1863-06-29 1 "ran all the cars"
c tri0629b 400 sn83030213 1863-06-29 1 "Michael Dowling was taken"
c star0629p1 250 sn83045462 1863-06-29 1 "lost about three hundred men"
c star0701p1 250 sn83045462 1863-07-01 1 "there arrived one hundred"
c star0627p1 250 sn83045462 1863-06-27 1 "at noon yesterday"
c dnl0701p2 300 sn83026172 1863-07-01 2 "About four o’clock on Monday"
c spy0703p1 500 sn83021205 1863-07-03 1 "reached there about 5"
c dnl0630p3 300 sn83026172 1863-06-30 3 "number of wagons captured was"
c star0629p2 200 sn83045462 1863-06-29 2 "WAGONS AND OVER ONE"
c whig0707p2 650 sn84024669 1863-07-07 2 "They advanced ou Tuesday to Hanover"
c her0702p10 250 sn83030313 1863-07-02 10 "General Rarly"
c spy0701p1 250 sn83021205 1863-07-01 1 "large body of iederal cavalry"
c spy0702p1 250 sn83021205 1863-07-02 1 "Gen. Buford drove u regiment"
c cht0629p1b 300 sn84031490 1863-06-29 1 "Good authority says that yesterday"
echo finished
