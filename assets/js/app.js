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
export const showToast = Helper.showNotification;

import { Swal, error, oopsError, successPopUp, errorPopUp } from "./utils/sweetalert2.js";
export const swal = Swal;
export const customError = error;
export const customOopsError = oopsError;
export const successNotification = successPopUp;
export const errorNotification = errorPopUp;

export const OPERATION_FAILED = 'Operation Failed. Please try again later!';
export const OOOPS = 'Oops, something went wrong!';
export const REQUEST_NOT_PROCESSED = 'The request can not be processed at this time.';


export const modules = [
  "Attraction & Sourcing",
  "Selection & Hiring",
  "Onboarding",
  "Core HR & Operations",
  "Time, Pay & Benefits",
  "Employee Engagement & support",
  "Expenses",
  "Talent, Performance & Development",
  "Engagement, Culture & Wellbeing",
  "Mobility, Compliance & Workforce Risk",
  "Analytics, Integration & Intelligent Layers"
];

export const subCategories = {
  "Attraction & Sourcing": [
    "Employer Branding & Career Sites",
    "Candidate Relationship Management (CRM)",
    "Sourcing & Recruitment Marketing",
    "Programmatic Job Advertising"
  ],
  "Selection & Hiring": [
    "Applicant Tracking Systems (ATS)",
    "Pre-Hire Assessment & Screening",
    "Interview Intelligence & Scheduling",
    "Background Screening & Verification",
    "Reference Checking",
    "Contingent Workforce / VMS & Freelancer Management"
  ],
  "Onboarding": [
    "Onboarding"
  ],
  "Core HR & Operations": [
    "HRIS / HRMS / HCM",
    "HR Service Delivery",
    "Case Management & Employee Relations",
    "Org Design & Headcount Planning",
    "Workforce Planning & Predictive Analytics"
  ],
  "Time, Pay & Benefits": [
    "Time & Attendance",
    "Scheduling & Labor Forecasting",
    "Leave & Absence Management",
    "Payroll Management",
    "Compensation Planning & Management",
    "Pay Equity Analytics",
    "Equity / Stock Management",
    "Benefits Administration"
  ],
  "Employee Engagement & support": [
    "Employee Communication & Education",
    "Financial Wellbeing & Earned Wage Access"
  ],
  "Expenses": [
    "Expense management"
  ],
  "Talent, Performance & Development": [
    "Performance Management",
    "Skills Intelligence & Internal Talent Marketplaces",
    "Succession Planning",
    "Career Pathing & Mentoring",
    "Coaching & Mentoring Platforms",
    "Learning Management Systems (LMS)",
    "Learning Experience Platforms (LXP)",
    "Learning Content Libraries"
  ],
  "Engagement, Culture & Wellbeing": [
    "Engagement Surveys & Feedback Tools",
    "Continuous Listening / Always-on Feedback",
    "Recognition & Rewards Platforms",
    "Employee Wellbeing Technology",
    "Internal Communication & Collaboration Hubs",
    "D&I Technology"
  ],
  "Mobility, Compliance & Workforce Risk": [
    "Mobility & Relocation",
    "Immigration & Right-to-Work",
    "Health & Safety / EHS"
  ],
  "Analytics, Integration & Intelligent Layers": [
    "People Analytics",
    "HR Chatbots & Virtual Assistants"
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
    "product_type": "platform",
    "target_market": null,
    "employee_count": null,
    "region": "global",
    "required_modules": [
        "Core HR / HRIS"
    ],
    "required_features": [
        "Employee Records & Profiles",
        "Organization Management"
    ],
    "required_integrations": [],
    "optional_features": [
        "Employee self-service portal"
    ],
    "use_cases": [
        "remote team management",
        "distributed workforce administration"
    ],
    "technology": [],
    "keywords": [
        "hris platforms",
        "remote teams",
        "employee self-service",
        "distributed workforce",
        "core hr"
    ],
    "query": "HRIS platforms for remote teams with employee self-service features."
};

export function lockBtn($btn, options = {}) {
    if ($btn.data('loading')) return null;
    $btn.data('loading', true);

    const spinnerColor = options.spinnerColor || 'white';

    $btn.append(`<span class="spinner-btn-clicked" style="border-top-color:${spinnerColor}"></span>`);
    $btn.css('pointer-events', 'none');

    return function resetBtn() {
        $btn.data('loading', false);
        $btn.find('.spinner-btn-clicked').remove();
        $btn.css('pointer-events', 'auto');
    };
}