import * as Helper from "./utils/helper.js";

export const getDateTime = Helper.formatDateTime;
export const setCookie = Helper.setCookie;
export const getCookie = Helper.getCookie;
export const xloader = Helper.xloader;
export const loaderWith3Dots = Helper.spinner3Dots;
export const getUrlParam = Helper.getUrlParameter;
export const getVendorRegion = Helper.getVendorRegion;
export const getModules = Helper.mapVendorModules;
export const getLogo = Helper.getLogo;
export const lowerCase = Helper.lowerCase;
export const isValidEmail = Helper.isValidEmail;
export const maskEmail = Helper.maskEmail;
export const currentYear = Helper.getCurrentYear;
export const initials = Helper.getInitials;

import { Swal, error, oopsError, successPopUp, errorPopUp } from "./utils/sweetalert2.js";
export const swal = Swal;
export const customError = error;
export const customOopsError = oopsError;
export const successNotification = successPopUp;
export const errorNotification = errorPopUp;

export const OPERATION_FAILED = 'Operation Failed. Please try again later!';
export const OOOPS = 'Oops, something went wrong!';
export const REQUEST_NOT_PROCESSED = 'The request can not be processed at this time.';

export const ZAPIER_CREATE_SEARCH_FILTERS = 'https://hooks.zapier.com/hooks/catch/25735666/uel2qx3/';
export const ZAPIER_SEND_EMAIL = 'https://hooks.zapier.com/hooks/catch/25735666/uptnlxt/';

export const modules = [
    'Core HR / HRIS',
    'ATS / Recruiting',
    'Payroll',
    'Time & Attendance',
    'Performance Management',
    'Employee Engagement',
    'People Analytics'
];

export const subCategories = {
    "Core HR / HRIS": [
        "Employee Records & Profiles",
        "Onboarding & Offboarding",
        "Organization Management",
        "Leave & Absence Management",
        "Compensation & Benefits",
        "Document Management",
        "Compliance & Audit"
    ],
    "ATS / Recruiting": [
        "Job Posting & Distribution",
        "Candidate Pipeline Management",
        "Interview Scheduling & Feedback",
        "Offer Management",
        "Employer Branding"
    ],
    "Payroll": [
        "Payroll Processing",
        "Tax Filing & Compliance",
        "Compensation Adjustments",
        "Payslips & Reporting",
    ],
    "Time & Attendance": [
        "Time Tracking",
        "Shift & Schedule Management",
        "Overtime & Absence Tracking",
    ],
    "Performance Management": [
        "Goal Setting & OKRs",
        "Performance Reviews & Cycles",
        "Continuous Feedback",
        "360 Feedback",
    ],
    "Employee Engagement": [
        "Surveys & Pulse Checks",
        "Recognition & Rewards",
        "Communication & Announcements",
    ],
    "People Analytics": [
        "Workforce Dashboards & Reports",
        "Headcount & Turnover Analysis",
        "DEI Analytics",
        "Predictive Insights",
    ]
};

export let searchQueries = [
  "Payroll systems for companies in South Africa with 120 employees.",
  "Enterprise applicant tracking systems with Workday integration.",
  "HRIS platforms for remote teams with employee self-service features.",
  "Payroll software compliant with African labor regulations.",
  "AI-powered performance management tools for growing tech companies.",
  "Human resource management systems for small businesses in the UK.",
  "Employee engagement platforms with analytics and reporting capabilities.",
  "Recruitment software for healthcare organizations in the United States.",
  "Cloud-based HR systems with onboarding and leave management features.",
  "Global workforce management solutions supporting multi-country payroll.",
  "I'm looking for a payroll system for a company in New York that supports 120+ employees.",
  "We need an enterprise applicant tracking system that integrates with Workday.",
  "Our team requires an HRIS platform suitable for remote teams with employee self-service features.",
  "We are searching for payroll software that complies with African labor regulations.",
  "I'd like to find AI-powered performance management tools for a growing tech company.",
  "Our small business in the UK needs a human resource management system.",
  "We're interested in employee engagement platforms with strong analytics and reporting capabilities.",
  "Looking for recruitment software tailored for healthcare organizations in the United States.",
  "We want cloud-based HR systems that handle onboarding and leave management efficiently.",
  "Searching for global workforce management solutions that support multi-country payroll."
];

export const mockUpFilter = {
    "industry": "human resources",
    "product_type": "system",
    "target_market": [
        "mid-size businesses",
        "small to mid-sized businesses"
    ],
    "employee_count": "120+",
    "region": "new york",
    "required_modules": [
        "payroll"
    ],
    "required_features": [
        "payroll processing"
    ],
    "technology": [],
    "use_cases": [
        "payroll processing"
    ],
    "keywords": [
        "payroll system",
        "new york",
        "120+ employees"
    ]
};