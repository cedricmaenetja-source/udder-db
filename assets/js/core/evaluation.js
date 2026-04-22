import * as App from '../app.js';
import { PAGES } from '../utils/constants.js';

$(function(){
    const vendorId = App.getUrlParam('id');
    if (vendorId === null){
        location.href = PAGES.home;
        return;
    }

    let myShortlist = App.getCookie('shortlist');
        
    myShortlist = (myShortlist == null) ? JSON.parse('[]') : JSON.parse(decodeURIComponent(myShortlist));
    
    const selectedVendor = myShortlist.find(item => item.id === vendorId);
    const matchScore = (selectedVendor.matchScore === 'NaN') ? 0 : selectedVendor.matchScore;
    const systemPart = (selectedVendor.systemPart === undefined) ? 'N/A' : selectedVendor.systemPart;

    $('#platformNameDisplay').text(selectedVendor.name);
    $('#platformLogoPlaceholder').text(App.initials(selectedVendor.name));
    $('#platformTypeDisplay').text(systemPart);
    $('#matchScoreDisplay').text(`${matchScore}%`);
});