"""Lookups for epilogue items that no saved page supports (recorded as failed lookups, Law 4)."""
W = ('1863-11-18', '1863-11-24')
LOOKUPS = [
    dict(ids=['E-001', 'R22.0001'], key='mcdougall', what='William McDougall (Canadian politician) named among those who arrived with the President, 18 Nov.',
         patterns=[r"Mc ?Dougall", r"M'Dougall", r"Macdougall"], window=W, state_date='1863-11-18'),
    dict(ids=['E-002', 'R22.0002'], key='bigham', what='The two Bigham brothers as guards of the President on the night of 18 Nov.',
         patterns=[r"Bigham"], window=W, state_date='1863-11-18'),
    dict(ids=['E-003', 'R22.0003'], key='writing-address', what='Lincoln still writing the address on the morning of 19 Nov (Nicolay finds him), or revising it at the lodging.',
         patterns=[r"(writing|finishing|revis\w+|prepar\w+|completing)\W+(\w+\W+){0,6}(address|speech|remarks)", r"Nicolay\W+(\w+\W+){0,8}(writ\w+|found)"], window=W, state_date='1863-11-19',
         hits_note='the one hit (Herald 20 Nov, image 11) is an advertisement ("prepared to pay liberally need apply. Address G. H. P."), not a statement about Lincoln',
         remains='no newspaper of the saved pages says what Lincoln was doing at 09:00; the row rests on Nicolay\'s account (not a newspaper)'),
    dict(ids=['E-004', 'R22.0004'], key='horse-colour', what='Lincoln on a chestnut bay horse in the procession.',
         patterns=[r"chestnut (bay|horse|mare|gelding|steed)", r"bay (horse|mare|gelding|steed)\W+(\w+\W+){0,8}(President|Lincoln)", r"(President|Lincoln)\W+(\w+\W+){0,10}(chestnut|bay horse|bay mare|sorrel|black horse|grey horse|gray horse)"],
         window=W, state_date='1863-11-19'),
    dict(ids=['E-013', 'R22.0013'], key='baugher-name', what='Rev. H. L. Baugher named as the giver of the benediction.',
         patterns=[r"Baugher", r"Baughcr", r"Bauglier", r"Bangher", r"Baughor"], window=W, state_date='1863-11-19',
         remains='the Nashville Daily Union of 24 Nov prints "Rev. Mr. Bonher" (damaged or garbled); no saved page prints Baugher'),
    dict(ids=['E-008', 'R22.0008'], key='marine-band-platform', what='The U.S. Marine Band playing at the platform during the exercises.',
         patterns=[r"Marine Band\W+(\w+\W+){0,40}(platform|stand|exercises|cemetery|hymn|dirge|performed|played)", r"(platform|stand|exercises|cemetery)\W+(\w+\W+){0,40}Marine Band"], window=W, state_date='1863-11-19',
         remains='the Marine Band is printed only as travelling with the party (see the Marine Band claim)'),
]
