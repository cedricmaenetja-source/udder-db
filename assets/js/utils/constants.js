export const HOSTNAME = window.location.origin;

export const PAGES = {
    home: `${HOSTNAME}/db`,
    login: `${HOSTNAME}/login.html`,
    signup: `${HOSTNAME}/signup.html`,
    vendor: `${HOSTNAME}/vendor`,
    platform: `${HOSTNAME}/db/platform.html`,
    assign_vendor: `${HOSTNAME}/user/vendor/assign.html`,
};

export const OTP_VERIFICATION_EMAIL = `
    <p>Hello,<br/><br/>

    Your One-Time Password (OTP) for verification is:<br/><br/>

    <strong>{{OTP_CODE}}</strong><br/><br/>

    This code will expire in 10 minutes.<br/><br/>

    If you did not request this code, please ignore this email.<br/><br/>

    Thanks,<br/>
    Udder</p>`;

export const RESET_PASSWORD_EMAIL = `
    <p>Hello,<br/><br/>

    To reset your password, click the link below:<br/><br/>

    <strong>{{LINK}}</strong><br/><br/>

    This link will expire in 1 hour.<br/><br/>

    If you did not request this, please report this immediately at support-db@udder.rocks.<br/><br/>

    Thanks,<br/>
    Udder</p>`;

export const CERTIFICATION_REQUESTED_EMAIL = `
    <p>Hello,<br/><br/>

    A certification request for vendor <strong>{{VENDOR_NAME}}</strong> was made by:<br/><br/>

    <strong>{{FNAME}} {{LNAME}}</strong><br/>
    <strong>{{EMAIL}}</strong><br/><br/>

    If you did not request this, please report this immediately at support-db@udder.rocks.<br/><br/>

    Thanks,<br/>
    Udder</p>`;

export const GET_IN_TOUCH_EMAIL = `
    <p>Hello,<br/><br/>

    A new message for vendor <strong>{{VENDOR_NAME}}</strong> was made received:<br/><br/>

    <strong>Name: {{FNAME}} {{LNAME}}</strong><br/>
    <strong>Email: {{EMAIL}}</strong><br/>
    <strong>Service: {{SERVICE}}</strong><br/><br/>
    <strong>Message: {{MSG}}</strong><br/><br/>

    Thanks,<br/>
    Udder</p>`;

export const UDDER_SUPPORT = 'cedric.maenetja+udder-db@udder.rocks';
export const VENDOR_CLAIM_EMAIL = `
    <p>Hello,<br/><br/>

    A new claim for vendor <strong>{{VENDOR_NAME}}</strong> was received:<br/><br/>

    User Name: <strong>{{USER_NAME}}</strong><br/>
    User Email: <strong>{{USER_EMAIL}}</strong><br/>
    <br/><br/>

    Thanks,<br/>
    Udder</p>`;

export const NEW_VENDOR_REQUEST_EMAIL = `
    <p>Hello,<br/><br/>

    A new vendor request was received:<br/><br/>

    User Name: <strong>{{USER_NAME}}</strong><br/>
    User Email: <strong>{{USER_EMAIL}}</strong><br/>
    Website Url: <strong>{{WEBSITE_URL}}</strong><br/>
    <br/><br/>

    Thanks,<br/>
    Udder</p>`;

export const COMPANY_SIZE = [
    '1-50',
    '51-100',
    '101-200',
    '201-500',
    '501-1000',
    '1001+'
];

export const LOCATIONS = [
  // North America - countries
  'United States', 'Canada', 'Mexico', 'Greenland', 'Bermuda', 'Bahamas', 'Cuba', 'Jamaica', 'Puerto Rico',

  // US states
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
  'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
  'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',

  // Canadian provinces & territories
  'Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Nova Scotia','Ontario','Prince Edward Island',
  'Quebec','Saskatchewan','Northwest Territories','Nunavut','Yukon',

  // Central & South America countries
  'Argentina','Brazil','Chile','Colombia','Peru','Venezuela','Ecuador','Bolivia','Paraguay','Uruguay',
  'Costa Rica','Panama','Guatemala','Honduras','El Salvador','Nicaragua','Belize',

  // Europe - countries
  'United Kingdom','Germany','France','Italy','Spain','Netherlands','Belgium','Sweden','Norway','Denmark',
  'Finland','Ireland','Switzerland','Austria','Poland','Czech Republic','Slovakia','Hungary','Portugal','Greece',
  'Iceland','Luxembourg','Monaco','Liechtenstein','Malta','San Marino','Vatican City','Croatia','Slovenia','Estonia',
  'Latvia','Lithuania','Russia','Ukraine','Belarus','Turkey','Bulgaria','Romania','Serbia','Montenegro','Kosovo',
  'North Macedonia','Albania','Bosnia and Herzegovina',

  // Europe - regions / cities
  'London','Paris','Berlin','Madrid','Rome','Amsterdam','Vienna','Prague','Warsaw','Oslo',
  'Stockholm','Helsinki','Copenhagen','Lisbon','Athens','Zurich','Munich','Barcelona','Milan','Hamburg',

  // Asia - countries
  'China','Japan','South Korea','North Korea','India','Pakistan','Bangladesh','Sri Lanka','Nepal','Bhutan',
  'Thailand','Vietnam','Myanmar','Cambodia','Malaysia','Singapore','Philippines','Indonesia','Brunei','Laos',
  'Mongolia','Kazakhstan','Uzbekistan','Turkmenistan','Tajikistan','Kyrgyzstan','Afghanistan','Iran','Iraq','Israel',
  'Jordan','Lebanon','Saudi Arabia','United Arab Emirates','Qatar','Kuwait','Oman','Yemen',

  // Asia - regions / cities
  'Tokyo','Osaka','Beijing','Shanghai','Seoul','Mumbai','Delhi','Bangkok','Jakarta','Kuala Lumpur',
  'Singapore City','Manila','Dhaka','Karachi','Tehran','Riyadh','Dubai','Tel Aviv',

  // Africa - countries
  'South Africa','Egypt','Nigeria','Kenya','Morocco','Algeria','Tunisia','Ghana','Senegal','Ethiopia',
  'Uganda','Tanzania','Zimbabwe','Botswana','Namibia','Mozambique','Angola','Cameroon','Ivory Coast','Mali',

  // Africa - regions / cities
  'Cape Town','Johannesburg','Nairobi','Lagos','Cairo','Casablanca','Accra','Addis Ababa','Dakar','Abidjan',

  // Oceania - countries
  'Australia','New Zealand','Fiji','Papua New Guinea','Samoa','Tonga','Vanuatu','Solomon Islands','New Caledonia','Micronesia',

  // Australia - states
  'New South Wales','Victoria','Queensland','Western Australia','South Australia','Tasmania','Australian Capital Territory','Northern Territory',

  // New Zealand - regions
  'Auckland','Wellington','Christchurch','Hamilton','Dunedin','Queenstown','Rotorua','Napier','Tauranga',

  // Misc / Global regions
  'Global','North America','South America','Europe','Asia','Africa','Oceania','Middle East','Caribbean','Central America'
];

export const HRINTEGRATIONS = [
  {'name':'Workday', 'logo':'images/workday.png'}, {'name':'ADP', 'logo':'images/adp.png'}, {'name':'Deel', 'logo':'images/deel.png'}, {'name':'ADP Workforce Now', 'logo':'images/adp.png'}, {'name':'BambooHR', 'logo':'images/bamboohr.png'},
  {'name':'Paycom', 'logo':'images/paycom.png'}, {'name':'Paylocity', 'logo':'images/paylocity.png'}, {'name':'Gusto', 'logo':'images/gusto.png'}, {'name':'Rippling', 'logo':'images/rippling.png'}, {'name':'Papaya Global', 'logo':'images/papayaglobal.png'}, {'name':'Personio', 'logo':'images/personio.png'}, {'name':'Comeet', 'logo':'images/comeet.png'}, {'name':'Taleo', 'logo':'images/taleo.png'}, {'name':'Namely', 'logo':'images/namely.png'},
  {'name':'LinkedIn', 'logo':'images/linkedin.png'}, {'name':'DocuSign', 'logo':'images/docusign.png'}, {'name':'Adobe Sign', 'logo':'images/adobesign.jpg'}, {'name':'Salesforce', 'logo':'images/salesforce.png'}, {'name':'Leapsome', 'logo':'images/leapsome.png'},
  {'name':'Bupa', 'logo':'images/bupa.png'}, {'name':'Chargebee', 'logo':'images/chargebee.png'}, {'name':'Zapier', 'logo':'images/zapier.png'}, {'name':'Merge.dev', 'logo':'images/merge-dev.png'},
  {'name':'Greenhouse', 'logo':'images/greenhouse.jpg'}, {'name':'Lever', 'logo':'images/lever.png'}, {'name':'Jobvite', 'logo':'images/jobvite'}, {'name':'iCIMS', 'logo':'images/icims.png'}, {'name':'SmartRecruiters', 'logo':'images/smartrecruiters.png'}, {'name':'Workable', 'logo':'images/workable.png'},
  {'name':'JazzHR', 'logo':'images/jazzhr.png'}, {'name':'Perkbox', 'logo':'images/perkbox.png'}, {'name':'Gympass', 'logo':'images/wellhub.png'}, {'name':'Wellhub', 'logo':'images/wellhub.png'},
  {'name':'Slack', 'logo': 'images/slack.png'}, {'name':'Microsoft Teams', 'logo':'images/ms-teams.svg'}, {'name':'Google Workspace', 'logo':'images/google-workspace.svg'}, 
  {'name':'Jira', 'logo':'images/jira.png'}, {'name':'Microsoft 365', 'logo': 'images/ms-365.svg'},
  {'name':'Culture Amp', 'logo':'images/cultureamp.png'}, {'name':'Lattice', 'logo':'images/lattice.png'},
  {'name':'QuickBooks', 'logo':'images/quickbooks.png'}, {'name':'Xero', 'logo':'images/xero.svg'}, {'name':'Expensify', 'logo':'images/expensify.png'}, {'name':'NetSuite', 'logo':'images/netsuite.svg'},
  {'name':'Okta', 'logo':'images/okta.png'}, {'name':'OneLogin', 'logo':'images/onelogin.png'}, {'name':'Azure Active Directory', 'logo':'images/azure.png'}, {'name':'Zoom', 'logo':'images/zoom.png'},
  {'name':'GoToMeeting', 'logo':'images/gotomeeting.png'}, {'name':'Cornerstone OnDemand', 'logo':'images/cornerstone-ondemand.png'}, {'name':'Docebo', 'logo':'images/docebo.png'},
  {'name':'SAP SuccessFactors', 'logo':'images/sap.png'}, {'name':'Oracle HCM', 'logo':'images/oracle.png'}, {'name':'UKG (Ultimate Kronos Group)', 'logo':'images/ukg.png'},
  {'name':'Ceridian Dayforce', 'logo':'images/dayforce.png'}, {'name':'Bullhorn', 'logo':'images/bullhorn.png'}, {'name':'JobDiva', 'logo':'images/jobdiva.png'}, {'name':'Hireology', 'logo':'images/hireology.png'},
  {'name':'HiBob', 'logo':'images/hibob.png'}, {'name':'Microsoft Azure AD', 'logo':'images/ms-azure.png'}
];