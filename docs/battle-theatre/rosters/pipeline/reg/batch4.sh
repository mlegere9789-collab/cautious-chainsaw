#!/bin/sh
cd /c/Users/mlege/gettysburg-map
python -I -X utf8 docs/battle-theatre/rosters/pipeline/reg/regfetch.py ia-xml annualreportadj07offigoog
python -I -X utf8 docs/battle-theatre/rosters/pipeline/reg/regfetch.py get "https://archive.org/download/AnnualReportOfTheAdjutantGeneralOfTheStateOfWestVirginia1864/AnnualReportOfTheAdjutantGeneralOfTheStateOfWestVirginiaForTheYearEndingDecember31...1864_djvu.xml" wv1864_b_djvu.xml "IA AnnualReportOfTheAdjutantGeneralOfTheStateOfWestVirginia1864 djvu.xml (second scan of the 1864 report)"
echo DONE
