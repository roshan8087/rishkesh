const assets = './public/itinerary/'
const originalPdfUrl = `${assets}rishikesh-itinerary-original.pdf`

export const itinerarySections = [
  {
    title: 'Rishikesh Trip Itinerary',
    blocks: [
      { type: 'text', text: 'RISHIKESH ITINERARY\n(28,29,30,1,2,3)\n27-11-2026' },
      {
        type: 'text',
        text: 'EVERYONE Joining from Nagar, Pune and Jamkhed must reach Ashu’s house one day before departure as we’ll be leaving early around 5:30am to catch the bus',
      },
      { type: 'link', text: 'Location : https://share.google/XhKxtgWUn0u2fOv3A', url: 'https://share.google/XhKxtgWUn0u2fOv3A' },
      { type: 'text', text: 'Arrival time : According to your convenience (Friday night)' },
      { type: 'link', text: 'Open the original 9-page itinerary PDF', url: originalPdfUrl },
    ],
  },
  {
    title: 'Travel Schedule',
    blocks: [
      {
        type: 'text',
        text: '28-11-2026\nBefore 5:30am = wake up, freshen up, take a shower, get dressed and get ready for the journey\n5:30am-06:00am = Reach Tarakpur Bus stand\n06:00am-08:30am = Reach Shirdi bus stand\n08:30am-09:00am = Shirdi bus stand-to-Shirdi Railway station\n09:00am-10:00am = Buffer time + Breakfast',
      },
      {
        type: 'text',
        text: '29-11-2026\n6:30am : Arrival at Hazrat Nizamuddin: 29 November 2026, 6:28 AM\n12:00pm = check in !\n12:00PM-02:00PM = FRESH\n02:00PM-03:00PM = LUNCH',
      },
      { type: 'text', text: '30-11-2026\nRIVER RAFTING &\n01-12-2026\nBUNGEE JUMPING AND PARAGLIDING\n02-12-2026' },
      { type: 'text', text: '03-12-2026\n06:15am = Train leaves Rishikesh at 6:15am' },
    ],
  },
  {
    title: 'Train Journey Details',
    blocks: [
      {
        type: 'text',
        text: 'Train journey from Sai-nagar Shirdi (SNSI) to Hazrat Nizamuddin (NZM) will be approximately 20 hours 28 minutes (1366km)',
      },
      {
        type: 'text',
        text: 'Train Journey from Yog-Nagari Rishikesh to Ahmednagar will be approximately 32 hours 7minutes (1702km)',
      },
      {
        type: 'image',
        src: `${assets}page-3-image-1.jpeg`,
        alt: 'Yog Nagari Rishikesh railway station, as pictured in the itinerary PDF',
        caption: 'Original image from page 3 of the itinerary PDF.',
      },
      {
        type: 'image',
        src: `${assets}page-4-image-1.jpeg`,
        alt: 'Railway station garden pictured in the itinerary PDF',
        caption: 'Original image from page 4 of the itinerary PDF.',
      },
    ],
  },
  {
    title: 'Delhi to Rishikesh Transport Details',
    blocks: [
      {
        type: 'text',
        text: '06:30am\nTravel Update!\nWe have booked 2 Ertiga cars for our journey to Rishikesh.\nPickup: Directly from our location in Delhi (NZM) station\nDrop: Directly at Rishikesh\nCost: ₹4,000 per car (₹8,000 for both cars)\nDistance: 238 km (Travel time: Approximately 4 hours 11 minutes)\nno need to worry about local buses or changing transport & BREAKFAST',
      },
      {
        type: 'image',
        src: `${assets}page-2-image-1.jpeg`,
        alt: 'Ertiga car pictured in the itinerary PDF',
        caption: 'Original image from page 2 of the itinerary PDF.',
      },
    ],
  },
  {
    title: 'River Rafting',
    blocks: [{ type: 'text', text: '30-11-2026\nRIVER RAFTING' }],
  },
  {
    title: 'Bungee Jumping and Paragliding',
    blocks: [{ type: 'text', text: '01-12-2026\nBUNGEE JUMPING AND PARAGLIDING' }],
  },
  {
    title: 'Return Journey',
    blocks: [
      { type: 'text', text: '03-12-2026\n06:15am = Train leaves Rishikesh at 6:15am' },
      {
        type: 'text',
        text: 'Experience the most beautiful clean, green railway station (YOG NAGARI RAILWAY STATION)',
      },
      {
        type: 'link',
        text: 'From = https://maps.app.goo.gl/ttbjyZ4aZMDdvGei8?g_st=ic',
        url: 'https://maps.app.goo.gl/ttbjyZ4aZMDdvGei8?g_st=ic',
      },
      { type: 'text', text: '04-December-2026\nArrival at ahilyanagar railway station : Friday afternoon (02:22pm)\nHome sweet Home' },
    ],
  },
  {
    title: 'Important Travel Information',
    blocks: [
      {
        type: 'text',
        text: 'EVERYONE Joining from Nagar, Pune and Jamkhed must reach Ashu’s house one day before departure as we’ll be leaving early around 5:30am to catch the bus\nArrival time : According to your convenience (Friday night)',
      },
      {
        type: 'text',
        text: 'no need to worry about local buses or changing transport & BREAKFAST',
      },
    ],
  },
  {
    title: 'Splitwise Information',
    blocks: [
      {
        type: 'text',
        text: 'IMPORTANT\nWe’ll be using Splitwise App to track all our trip expenses and keep everything transparent and organised.\nPlease join our group using the link below:\nPlease make sure everyone joins\nLet’s keep the money matters sorted and focus on making memories!',
      },
      {
        type: 'link',
        text: 'https://www.splitwise.com/join/us9BmBgkgMM+1wl1rb?v=e',
        url: 'https://www.splitwise.com/join/us9BmBgkgMM+1wl1rb?v=e',
      },
    ],
  },
  {
    title: 'Friends’ Instagram Profiles',
    blocks: [
      {
        type: 'text',
        text: 'Let’s connect on Instagram too!\nSince some of us are meeting for the first time, let’s get to know each other a little better.',
      },
      {
        type: 'list',
        items: [
          { text: 'Anand : https://www.instagram.com/anandbora09?bqrl=MWh6bm1pY2FicGliMQ==', url: 'https://www.instagram.com/anandbora09?bqrl=MWh6bm1pY2FicGliMQ==' },
          { text: 'Mahak : https://www.instagram.com/mahakaa10.__?hvrq=MWF2aHNqODl0NWUxdA==', url: 'https://www.instagram.com/mahakaa10.__?hvrq=MWF2aHNqODl0NWUxdA==' },
          { text: 'Nupur : https://www.instagram.com/nupurr.___?lqvp=dWtsdHQ2em92bjE0', url: 'https://www.instagram.com/nupurr.___?lqvp=dWtsdHQ2em92bjE0' },
          { text: 'Rajat : https://www.instagram.com/i_m_rajat07?jplx=MWdtZWpxZnJ6anIzaQ==', url: 'https://www.instagram.com/i_m_rajat07?jplx=MWdtZWpxZnJ6anIzaQ==' },
          { text: 'Renuka : https://www.instagram.com/renu011_?cnvx=MWVzbmpwc3hkNHF6Yw==', url: 'https://www.instagram.com/renu011_?cnvx=MWVzbmpwc3hkNHF6Yw==' },
          { text: 'Roshan : https://www.instagram.com/roshan_varma____?jplx=M3BzZWdlYjYzaDBm', url: 'https://www.instagram.com/roshan_varma____?jplx=M3BzZWdlYjYzaDBm' },
          { text: 'Sai : https://www.instagram.com/saithite_?gwpx=MWhxNmhnN2VzOGM2eQ==', url: 'https://www.instagram.com/saithite_?gwpx=MWhxNmhnN2VzOGM2eQ==' },
          { text: 'Srushti : https://www.instagram.com/srushti_bothara?evlk=MWdyd2VobXNhYzJjdQ==', url: 'https://www.instagram.com/srushti_bothara?evlk=MWdyd2VobXNhYzJjdQ==' },
          { text: 'Tejas : https://www.instagram.com/tejasgdekr?hvrq=MWowd2NlcGFuZWN6ZA==', url: 'https://www.instagram.com/tejasgdekr?hvrq=MWowd2NlcGFuZWN6ZA==' },
          { text: 'Prajwal : https://www.instagram.com/kon_praajwal__?gwpx=anNoczh6OTJxcTF4', url: 'https://www.instagram.com/kon_praajwal__?gwpx=anNoczh6OTJxcTF4' },
          { text: 'Zawar : https://www.instagram.com/ashhhuuuu_?cnvx=MWxheTR3dTQ5eGF5MA==', url: 'https://www.instagram.com/ashhhuuuu_?cnvx=MWxheTR3dTQ5eGF5MA==' },
        ],
      },
    ],
  },
  {
    title: 'Telegram Group Information',
    blocks: [
      {
        type: 'text',
        text: 'A little home for all our Rishikesh memories!\nWe’ll be sharing all our trip photos and videos in this Telegram group, so everyone can easily view and download them anytime. So don’t forget to join the group!\nOne trip, countless memories, and a lifetime of photo dumps!',
      },
      { type: 'link', text: 'Telegram group link : https://t.me/+UpPRrcjSxjBjYmVl', url: 'https://t.me/+UpPRrcjSxjBjYmVl' },
    ],
  },
  {
    title: 'Payment Information and QR Code',
    blocks: [
      {
        type: 'text',
        text: 'MOST IMPORTANT\nPlease pay ₹20,000 to Ashu’s UPI ID mentioned in the QR code, whenever convenient\nON OR BEFORE 28-11-2026\nThe idea is to have all the trip expenses managed by one person so that everything stays organised and hassle-free.\nAny money left over or any extra expenses incurred will be adjusted equally at the end of the trip.\nLet’s make this trip smooth and memorable!\nUPI ID = ashutoshzawar22@okicici\nQR CODE :',
      },
      {
        type: 'image',
        src: `${assets}page-6-image-1.jpeg`,
        alt: 'Original payment QR code and UPI ID from the itinerary PDF',
        caption: 'Original QR code from page 6 of the itinerary PDF.',
      },
    ],
  },
  {
    title: 'Places in Rishikesh',
    blocks: [{ type: 'text', text: 'PLACES IN RISHIKESH' }],
  },
  {
    title: 'Waterfalls',
    blocks: [
      {
        type: 'list',
        items: [
          'Neer waterfall',
          { text: 'GOA BEACH RISHIKESH — https://www.instagram.com/reel/DBQYLSBzWuJ/?jplx=YmlqaHM2aHlpdDY=', url: 'https://www.instagram.com/reel/DBQYLSBzWuJ/?jplx=YmlqaHM2aHlpdDY=' },
          'Pink beach',
          'Kalikund waterfall',
          'Bairaj dam',
          'KOTLI BHEL WATERFALL',
          'KAUDIYALA (BEACH & CAMPING)',
          'MARINE DRIVE',
          'SECRET WATERFALL',
        ],
      },
    ],
  },
  {
    title: 'Cafes',
    blocks: [
      {
        type: 'list',
        items: [
          { text: 'Little buddha café – chilled river view spot (lunch) = https://www.instagram.com/reel/Dd09dxVoGk3/?knvt=bmlyc3BybGh4OXh5', url: 'https://www.instagram.com/reel/Dd09dxVoGk3/?knvt=bmlyc3BybGh4OXh5' },
          { text: 'GANGA VIEW CAFÉ — https://www.instagram.com/reel/DT-VnTWE884/?bqrl=eTVmNWVxNmFqanNq', url: 'https://www.instagram.com/reel/DT-VnTWE884/?bqrl=eTVmNWVxNmFqanNq' },
          { text: 'THE ARCHES CAFÉ : https://www.instagram.com/reel/DUQWi0TElty/?gwpx=MTRrZzI5bTNod3JidA==', url: 'https://www.instagram.com/reel/DUQWi0TElty/?gwpx=MTRrZzI5bTNod3JidA==' },
          'RAMANA’S ORGANIC CAFÉ :',
          { text: 'THE QUIET CUP CAFÉ : https://www.instagram.com/reel/Da7_ioGx8j5/?lqvp=MXdjb3dyYzNkdHF2dA==', url: 'https://www.instagram.com/reel/Da7_ioGx8j5/?lqvp=MXdjb3dyYzNkdHF2dA==' },
          { text: 'HIDEOUT CAFÉ : https://www.instagram.com/reel/DSHxUFdCbk0/?lqvp=dmdhc3IzMGRibGV4', url: 'https://www.instagram.com/reel/DSHxUFdCbk0/?lqvp=dmdhc3IzMGRibGV4' },
          'FREEDOM CAFÉ :',
          'SHAMBALA CAFÉ :',
          'OM SHANTI CAFÉ’S :',
          'IRA’S KITCHEN AND TEA ROOM :',
          'TATT CAFÉ :',
          'THE 60’S CAFÉ ( THE BEATLES) :',
          'RAJASTHANI JALPAN & BHOJNALYA',
          { text: 'CHOTIWALA — https://www.instagram.com/reel/DX6rOj2vDiU/?hvrq=NmxiOGFuejVuNmE2', url: 'https://www.instagram.com/reel/DX6rOj2vDiU/?hvrq=NmxiOGFuejVuNmE2' },
          'VJ’S GIARDINE BY THE GANGES',
        ],
      },
    ],
  },
  {
    title: 'Other Places',
    blocks: [
      {
        type: 'list',
        items: [
          'DAYANAND GHAT',
          'TAPOVAN GHAT',
          'TRIVENI GHAT (GANGA AARTI)',
          'JANKI SETU',
          'RAM JHULA',
          'KYARKI VIEWPOINT',
        ],
      },
    ],
  },
  {
    title: 'Temples',
    blocks: [
      {
        type: 'list',
        items: [
          { text: 'TRAYAMBAKESHWAR TEMPLE — https://www.instagram.com/reel/DXTYRVGDzzf/?bqrl=MWpqOWhvdGw3M2llcg==', url: 'https://www.instagram.com/reel/DXTYRVGDzzf/?bqrl=MWpqOWhvdGw3M2llcg==' },
          { text: 'SUNRISE AT KUNJAPURI TEMPLE — https://www.instagram.com/reel/DPnjl_okTug/?bqrl=MXhlZzNwbGZoNWp6Zg==', url: 'https://www.instagram.com/reel/DPnjl_okTug/?bqrl=MXhlZzNwbGZoNWp6Zg==' },
          { text: 'PARMARTH NIKETAN — https://www.instagram.com/reel/DYt98pPPq6y/?lqvp=YjJlcDRmcDg1djdy', url: 'https://www.instagram.com/reel/DYt98pPPq6y/?lqvp=YjJlcDRmcDg1djdy' },
          { text: 'KYARKI VIEWPOINT — https://www.instagram.com/reel/DddRC-pMxAC/?dmpr=cHRyejV4dHFrbTEz', url: 'https://www.instagram.com/reel/DddRC-pMxAC/?dmpr=cHRyejV4dHFrbTEz' },
        ],
      },
    ],
  },
  {
    title: 'Stays / Hotels',
    blocks: [{ type: 'list', items: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] }],
  },
  {
    title: 'Activities',
    blocks: [
      { type: 'text', text: 'ACTIVITES POINT' },
      { type: 'list', items: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
    ],
  },
  {
    title: 'Reels to Make',
    blocks: [{ type: 'list', items: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] }],
  },
]
