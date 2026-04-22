export function formatDateTime() {
  const now = new Date();

  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();

  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  const timeZone = Intl.DateTimeFormat('en', { timeZoneName: 'short' })
    .formatToParts(now)
    .find(p => p.type === 'timeZoneName').value;

  return `${dayName} ${monthName} ${day}, ${year} · ${hours}:${minutes} ${ampm} ${timeZone}`;
} 

export function getInitials(str) {
    const words = $.trim(str).split(/\s+/);

    if (words.length >= 2) {
        return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    } else if (words.length === 1 && words[0] !== "") {
        return words[0].substring(0, 2).toUpperCase();
    }
    
    return "";
}

export function setCookie(name, value, days = 1) {
  const date = new Date();
  date.setTime(date.getTime() + days * 86400000);

  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
}

export function getCookie(name) {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1];
}

export function xloader(){
  return `
    <style>
      .loader {
        width: 8px;
        height: 48px;
        display: inline-block;
        position: relative;
        border-radius: 4px;
        box-sizing: border-box;
        animation: animloader 1s linear infinite alternate;
      }

      @keyframes animloader {
        0% {
          box-shadow: 20px 0 #000, 40px 0 #000, 60px 0 #000, 80px 0 #000, 100px 0 #000;
        }
        20% {
          box-shadow: 20px 0 white, 40px 0 #000, 60px 0 #000, 80px 0 #000, 100px 0 #000;
        }
        40% {
          box-shadow: 20px 0 white, 40px 0 white, 60px 0 #000, 80px 0 #000, 100px 0 #000;
        }
        60% {
          box-shadow: 20px 0 white, 40px 0 white, 60px 0 white, 80px 0 #000, 100px 0 #000;
        }
        80% {
          box-shadow: 20px 0 white, 40px 0 white, 60px 0 white, 80px 0 white, 100px 0 #000;
        }
        100% {
          box-shadow: 20px 0 white, 40px 0 white, 60px 0 white, 80px 0 white, 100px 0 white;
        }
      }
    </style>
    <span class="loader" style="margin-top:50px"></span>`;
}

export function spinner3Dots(){
  return `<style>
    .loader, .loader:before, .loader:after {
      border-radius: 50%;
      width: 2.5em;
      height: 2.5em;
      animation-fill-mode: both;
      animation: bblFadInOut 1.8s infinite ease-in-out;
    }
    .loader {
      color: #000;
      font-size: 7px;
      position: relative;
      text-indent: -9999em;
      transform: translateZ(0);
      animation-delay: -0.16s;
      display:block;
    }
    .loader:before,
    .loader:after {
      content: '';
      position: absolute;
      top: 0;
    }
    .loader:before {
      left: -3.5em;
      animation-delay: -0.32s;
    }
    .loader:after {
      left: 3.5em;
    }

    @keyframes bblFadInOut {
      0%, 80%, 100% { box-shadow: 0 2.5em 0 -1.3em }
      40% { box-shadow: 0 2.5em 0 0 }
    }
  </style>
  <span class="loader"></span>`;
}

export function getUrlParameter(name) {
    return new URLSearchParams(window.location.search).get(name);
}

export function getVendorRegion(vendor){
    let result = [];

    const location = (vendor.people_data_labs !== null) ? vendor.people_data_labs.location : {};

    if ($.isEmptyObject(location)) return;
    
    const country   = lowerCase(location.country || '');
    const locality  = lowerCase(location.locality || '');
    const continent = lowerCase(location.continent || '');
    const region    = lowerCase(location.region || '');
    const metro     = lowerCase(location.metro || '');
    const name      = lowerCase(location.name || '');

    if (country != '') result.push(country);
    if (locality != '') result.push(locality);
    if (continent != '') result.push(continent);
    if (region != '') result.push(region);
    if (metro != '') result.push(metro);
    if (name != '') result.push(name);

    const uniqueList = [...new Set(result)];
    return uniqueList.join(', ');
}

export function mapVendorModules(vendorModules){
    let data = {
        modules: [],
        subCategories: []
    };

    Object.entries(vendorModules).forEach(([moduleName, subModules]) => {
        Object.keys(subModules).forEach(subModuleName => {
            const featureList = vendorModules[moduleName][subModuleName];
            if (featureList.length > 0){
                data.modules.push(moduleName);
                data.subCategories.push(subModuleName);
            }
        });
    });

    if (data.modules > 0) data.modules = [...new Set(data.modules)];
    if (data.subCategories > 0) data.subCategories = [...new Set(data.subCategories)];

    return data;
}

export function getLogo(url){
    let file = url.substring(url.lastIndexOf('/') + 1);
    
    $.ajax({
        url: `../../assets/images/${encodeURI(file)}`,
        type: 'HEAD',
        success: function() {
            return `../../assets/images/${encodeURI(file)}`;
        }
    });

    return url;
}

export function lowerCase(str){
    if (str === null) return;
    return str.toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function maskEmail(email) {
    const [name, domain] = email.split('@');

    const visible = name.slice(0, 2);
    const masked = '*'.repeat(Math.max(name.length - 2, 1));

    return `${visible}${masked}@${domain}`;
}

export function getCurrentYear(){
  return new Date().getFullYear();
}