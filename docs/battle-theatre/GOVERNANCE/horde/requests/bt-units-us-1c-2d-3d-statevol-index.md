# Request from bt-units (group us-1c-2d-3d): section heading of NY2-S021 in docs/battle-theatre/library/statevol_index.json

What: the section `NY2-S021` of the state-volume index is headed "95th new YORK INFANTRY" (printed pages 731~735 to 758). Besides the 95th New York it holds, at its end (pp. 755 to 758), the speech of presentation of the monument of the 104th New York and the address of Col. Gilbert G. Prey, "The 104th New York at Gettysburg" (printed 1900). Records U-us-1c-2d-3d-0168, U-us-1c-2d-3d-0169, U-us-1c-2d-3d-0170 and U-us-1c-2d-3d-0171 of `us-1c-2d-3d.jsonl` cite that text under `NY2-S021` (pages 756~757 and 758); the checker finds every quote at its offset, and the records are right.

Why it matters (Law 4 and the card's source line): a reader who looks for the 104th New York under the heading of the 95th will not find the address.

The exact change wanted (not mine to make): re-title or split `NY2-S021` so that a heading names the 104th New York for pp. 755 to 758, or add a `contains` list of unit labels to the section; rebuild `statevol_index.json`. No record of the group file needs to change if the section id stays the same.

Other defects of the texts found by the group (no change wanted): the Official Records text of Robinson's report (OR27-1-R043, p. 291) prints "less than 3,500 officers and men" and "134 were commissioned officers"; two regimental histories that quote the same sentence (Davis, 1894; Cook, 1882) print 2,500 and 124: see the request `bt-units-us-1c-2d-3d-or27-r043-strength.md`.
