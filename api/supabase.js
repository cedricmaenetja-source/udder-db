import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IncomingForm } from 'formidable';
import fs from "fs";
import { serialize } from "cookie";
import { requireAuth } from './_auth';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
    const token = req.cookies.auth;
   
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return null;
    }

    const { data: session } = await supabase
        .from('tblsessions')
        .select('user_id')
        .eq('session_id', token)
        .maybeSingle();

    if (!session) {
        res.status(401).json({ error: 'Unauthorized' });
        return null;
    }

    const { action, vendorId, userId, referenceId } = req.query;

    const VALID_ACTIONS = [
        'getVendors',
        'getVendorById',
        'getFilter',
        'getUserById',
        'getVendorViewCount',
        'getVendorViewCountLast7Days',
        'getVendorLeads',
        'getVendorViews',
        'getVendorScreenshots',
        'GetVendorsForClaiming',
        'getTopVendors',
        'getEvaluations',
        'getNotificationPrefs',
        'saveNotificationPrefs',
        'checkGuestLimit',
        'getUserByEmail',
        'verifyOtp',
        'addVisitor',
        'saveEvaluation',
        'upsertFilter',
        'userSignUp',
        'updateOtp',
        'updateVerification',
        'login',
        'addToVendorAnalytics',
        'updateUserPassword',
        'addVendorLead',
        'updateLeadStatus',
        'updatePersonalDetails',
        'updateUserProfile',
        'updateVendor',
        'updateVendorAutoRefresh',
        'addClientInquiry',
        'uploadVendorScreenshots',
        'deleteAccount',
        'getAllEvaluations',
        'getUserClaim',
        'addComparison',
        'getComparisons',
        'logEvent',
        'updateVendorCategories',
        'getReferencesByVendorId',
        'getReferencesById',
        'addReference',
        'getVendorActivities',
        'addActivity',
        'addIntroRequest',
        'updateVendorProfile',
        'updateIntroRequest',
        'getUserComparisons',
        'submitVendorClaim',
        'getUserRequests',
        'getUserClaims',
        'addSearchMatches',
        'getSearchMatches',
        'getAllVendorActivities',
        'getAssignedVendors',
        'passIntroRequest',
        'updateLead',
        'verifyAdmin',
        'getUsers',
        'getAllUsers',
        'getIntroRequests',
        'getSearchFilters',
        'getVerifications',
        'getAdminActivities',
        'getAdminUsers',
        'getLeads',
        'getClientEnquiries',
        'createUser',
        'getTaxonomy',
        'updateTaxonomy',
        'deleteVendor',
        'createVendor'
    ];

    if (!action) {
        return res.status(400).json({ error: 'No action provided' });
    }

    if (!VALID_ACTIONS.includes(action)) {
        return res.status(400).json({ error: `Unknown action: "${action}". Did you forget to register it in VALID_ACTIONS?` });
    }

    if (action === 'getVendors') {
        return await getVendors(res);
    }

    if (action === 'getUsers') {
        return await getUsers(res);
    }

    if (action === 'getAllUsers') return await getAllUsers(res);
    if (action === 'getTaxonomy') return await getTaxonomy(res);
    
    if (action === 'getAdminActivities') return await getAdminActivities(res, userId);
    if (action === 'getVerifications') return await getVerifications(res);
    if (action === 'getSearchFilters') return await getSearchFilters(res);
    if (action === 'getIntroRequests') return await getIntroRequests(res);
    if (action === 'getAdminUsers') return await getAdminUsers(res, userId); 
    if (action === 'getLeads') return await getLeads(res);
    if (action === 'getClientEnquiries') return await getClientEnquiries(res);

    if (action === 'getVendorById') return await getVendorById(res, vendorId);
    if (action === 'getFilter') return await getFilter(res);
    if (action === 'getUserById') return await getUserById(res, userId); 
    if (action === 'getVendorViewCount') return await getVendorViewCount(res, vendorId); 
    if (action === 'getVendorViewCountLast7Days') return await getVendorViewCountLast7Days(res, vendorId);
    //if (action === 'getVendorLeads') return await getVendorLeads(res, vendorId);
    if (action === 'getVendorViews') return await getVendorViews(res, vendorId);
    if (action === 'getVendorScreenshots') return await getVendorScreenshots(res, vendorId);
    if (action === 'GetVendorsForClaiming') return await GetVendorsForClaiming(res);
    if (action === 'getTopVendors') return await getTopVendors(res, vendorId);
    if (action === 'getEvaluations') return await getEvaluations(res, vendorId, userId);
    if (action === 'getNotificationPrefs') return await getNotificationPrefs(res, userId);
    if (action === 'getAllEvaluations') return await getAllEvaluations(res, userId);
    if (action === 'getUserClaim') return await getUserClaim(res, userId);
    if (action === 'getComparisons') return await getComparisons(res, vendorId);
    if (action === 'getReferencesByVendorId') return await getReferencesByVendorId(res, vendorId);
    if (action === 'getReferencesById') return await getReferencesById(res, referenceId);
    //if (action === 'getVendorActivities') return await getVendorActivities(res, vendorId);
    if (action === 'getUserComparisons') return await getUserComparisons(res, userId, vendorId);
    if (action === 'getUserRequests') return await getUserRequests(res, userId);
    if (action === 'getUserClaims') return await getUserClaims(res, userId);
    
    if (action === 'passIntroRequest') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { id } = req.body;
            return await passIntroRequest(res, id);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'deleteVendor') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { id } = req.body;
            return await deleteVendor(res, id);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'createVendor') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { payload } = req.body;
            return await createVendor(res, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'createUser') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { payload } = req.body;
            return await createUser(res, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'updateLead') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { id, payload } = req.body;
            return await updateLead(res, id, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'getVendorActivities') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendor_ids } = req.body;
            return await getVendorActivities(res, vendor_ids);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'getSearchMatches') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendor_ids } = req.body;
            return await getSearchMatches(res, vendor_ids);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'getAllVendorActivities') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendor_ids } = req.body;
            return await getAllVendorActivities(res, vendor_ids);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'getVendorLeads') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendor_ids } = req.body;
            return await getVendorLeads(res, vendor_ids);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'getAssignedVendors') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendor_ids } = req.body;
            return await getAssignedVendors(res, vendor_ids);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'addSearchMatches') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { payload } = req.body;
            return await addSearchMatches(res, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'updateIntroRequest') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { requestId } = req.body;
            return updateIntroRequest(res, requestId);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'updateVendorProfile') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendorId, payload} = req.body;
            return updateVendorProfile(res, vendorId, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'addIntroRequest') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendorId, userId, message, mustHaves, targetImplementation, budgetIndication, title} = req.body;
            return addIntroRequest(res, vendorId, userId, message, mustHaves, targetImplementation, budgetIndication, title);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'addActivity') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { payload } = req.body;
            return await addActivity(res, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'addReference') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendorId, customer, industry, status, validated } = req.body;
            return await addReference(res, vendorId, customer, industry, status, validated);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'updateVendorCategories') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendorId, categories } = req.body;
            return await updateVendorCategories(res, vendorId, categories);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'logEvent') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { userId, route } = req.body;
            return await logEvent(res, userId, route);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'addComparison') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendorId, userId } = req.body;
            return await addComparison(res, vendorId, userId);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'deleteAccount') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { userId } = req.body;
            return await deleteAccount(res, userId);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'saveNotificationPrefs'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { user_id, prefs } = req.body;
            
            return await saveNotificationPrefs(res, user_id, prefs);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'checkGuestLimit'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { session_id } = req.body;
            
            return await checkGuestLimit(res, session_id);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    } 

    if (action === 'getUserByEmail'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { email } = req.body;
            
            return await getUserByEmail(res, email);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    } 

    if (action === 'verifyOtp'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { token, otp } = req.body;
            
            return await verifyOtp(res, token, otp);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'addVisitor'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { payload } = req.body;
            return await addVisitor(res, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'saveEvaluation'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { payload } = req.body;
            return await saveEvaluation(res, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'upsertFilter'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { payload } = req.body;
            return await upsertFilter(res, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'userSignUp'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { user } = req.body;
            return await userSignUp(res, user);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    } 

    if (action === 'updateOtp'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { id, otp } = req.body;
            return await updateOtp(res, id, otp);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'updateVerification'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { verified, id } = req.body;
            return await updateVerification(res, verified, id);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'login'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { email, password } = req.body;
            
            return await login(req, res, email, password);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }
    
    if (action === 'submitVendorClaim'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { payload } = req.body;
            
            return await submitVendorClaim(res, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    // if (action === 'addVendorRequest'){
    //     if (req.method !== "POST") {
    //         return res.status(405).json({ error: "Only POST allowed" });
    //     }

    //     try {
    //         const { userId, websiteUrl } = req.body;
            
    //         return await addVendorRequest(res, userId, websiteUrl);
    //     } catch (err) {
    //         console.error(err);
    //         res.status(500).json({ error: 'Internal error' });
    //     }
    // }

    if (action === 'addToVendorAnalytics'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendorId, ipAddress } = req.body;
            
            return await addToVendorAnalytics(res, vendorId, ipAddress);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'updateUserPassword'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { email, oldPassword, newPassword } = req.body;
            
            return await updateUserPassword(res, email, oldPassword, newPassword);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    } 

    if (action === 'addVendorLead'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { vendorId, clientDetails } = req.body;
            
            return await addVendorLead(res, vendorId, clientDetails);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'updateLeadStatus'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { id, status } = req.body;
            
            return await updateLeadStatus(res, id, status);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    } 
    
    if (action === 'updatePersonalDetails'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { id, payload } = req.body;
            
            return await updatePersonalDetails(res, id, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'updateUserProfile'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { id, payload } = req.body;
            
            return await updateUserProfile(res, id, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'updateVendor'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { id, payload, description } = req.body;
            
            return await updateVendor(res, id, payload, description);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    } 
    
    if (action === 'updateTaxonomy'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { payload } = req.body;
            
            return await updateTaxonomy(res, payload);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    } 

    if (action === 'updateVendorAutoRefresh'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { id, autoRefresh } = req.body;
            
            return await updateVendorAutoRefresh(res, id, autoRefresh);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    } 

    if (action === 'verifyAdmin'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { email, otp, token } = req.body;
            if (!email || !otp || !token) return res.status(400).json({ error: "Invalid Request" });

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (email != decoded.email && otp != decoded.otp) return res.status(401).json({ error: "Invalid Otp" });
            
            return res.status(200).json({ success: true });
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    }

    if (action === 'addClientInquiry'){
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        try {
            const { inquiry, client } = req.body;
            
            return await addClientInquiry(res, inquiry, client);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal error' });
        }
    }

    if (action === 'uploadVendorScreenshots') {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST allowed" });
        }

        const form = new IncomingForm();
        form.multiples = true;

        form.parse(req, async (err, fields, files) => {
            try {
                if (err) {
                    console.error("Form parse error:", err);
                    return res.status(500).json({ error: err.message });
                }

                const uploadedFiles = files.files || files.file || files;

                if (!uploadedFiles) {
                    return res.status(400).json({ error: "No files uploaded" });
                }

                return await uploadVendorScreenshots(
                    res,
                    fields.vendorId,
                    uploadedFiles
                );

            } catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
    }
}

async function deleteVendor(res, vendorId){
    const { error: deleteError } = await supabase
        .from('tblvendors')
        .delete()
        .eq('id', vendorId);

    if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true });
}

async function deleteAccount(res, userId) {
    const tables = [
        'tblnotificationpreferences',
        'tblevaluations',
        'tblvendorclaims',
        'tblvendorrequests',
        'tbllogs',
        'tblintrorequests'
    ];

    for (const table of tables) {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.warn(`Could not delete from ${table}:`, error.message);
            // Non-fatal — continue cleanup
        }
    }

    // Delete the user record from your own users table
    const { error: userError } = await supabase
        .from('tblusers')
        .delete()
        .eq('id', userId);

    if (userError) {
        return res.status(500).json({ error: userError.message });
    }

    return res.status(200).json({ success: true });
}

async function uploadVendorScreenshots(res, vendorId, filesToUpload) {
    const files = Array.from(filesToUpload);
    const uploadedFiles = [];

    for (const file of files) {

        const fileBuffer = fs.readFileSync(file.filepath);

        const filePath = `${vendorId}/${Date.now()}_${file.originalFilename}`;

        const { error } = await supabase.storage
            .from('udderdb-screenshots')
            .upload(filePath, fileBuffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            return res.status(500).json({
                data: null,
                error: error.message
            });
        }

        const { data } = supabase.storage
            .from('udderdb-screenshots')
            .getPublicUrl(filePath);

        uploadedFiles.push(data.publicUrl);
    }

    return res.status(200).json({
        data: uploadedFiles
    });
}

async function getVendorScreenshots(res, vendorId){
    const { data, error } = await supabase.storage
        .from('udderdb-screenshots')
        .list(`${vendorId}/`);

    if (error) {
        return res.status(500).json({
            data: null,
            error: error.message
        });
    }
    
    const images = data.map(file => {
        const { data: publicUrl } = supabase.storage
            .from('udderdb-screenshots')
            .getPublicUrl(`${vendorId}/${file.name}`);

        return publicUrl.publicUrl;
    });

    return res.status(200).json({ images });
}

async function getAssignedVendors(res, ids){
    if (!ids?.length) return res.status(200).json({ data: [] });

   const { data, error } = await supabase
    .from('tblvendors')
    .select('id, name, data')
    .in('id', ids);

    if (error) return res.status(500).json({ data: null, error: error.message });

    //Cache on Vercel Edge for 1 hour
    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    );

    return res.status(200).json({ data });
}

async function getVendors(res){
    const { data, error } = await supabase
        .from('tblvendors')
        .select('*')
        .order('name', { ascending: true });

    if (error) return res.status(500).json({ data: null, error: error.message });

    // Cache on Vercel Edge for 1 hour
    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    );

    return res.status(200).json({ data });
}

async function getVerifications(res){
    const { data, error } = await supabase
        .from('tblverifications')
        .select('*');

    if (error) return res.status(500).json({ data: null, error: error.message });

    // Cache on Vercel Edge for 1 hour
    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=600'
    );

    return res.status(200).json({ data });
}

async function getLeads(res){
    const { data, error } = await supabase
        .from('tbldbleads')
        .select('*');

    if (error) return res.status(500).json({ data: null, error: error.message });

    return res.status(200).json({ data });
}

async function getAdminUsers(res, userId){
    const { data, error } = await supabase
        .from('tblusers')
        .select('*')
        .eq('role', 'admin')
        .neq('id', userId);

    if (error) return res.status(500).json({ data: null, error: error.message });

    return res.status(200).json({ data });
}

async function getAdminActivities(res, userId){
    const { data, error } = await supabase
        .from('tblactivities')
        .select('*')
        .eq('user_type', 'admin')
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(4);

    if (error) return res.status(500).json({ data: null, error: error.message });

    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=600'
    );

    return res.status(200).json({ data });
}

async function getTaxonomy(res){
    const { data, error } = await supabase
        .from('tbltaxanomy')
        .select('*');

    if (error) return res.status(500).json({ data: null, error: error.message });

    return res.status(200).json({ data });
}

async function updateTaxonomy(res, payload){
    const { data, error } = await supabase
        .from('tbltaxanomy')
        .update(payload)
        .eq('id', 1); 

    if (error) return res.status(500).json({ data: null, error: error.message });

    return res.status(200).json({ data });
}

async function getAllUsers(res){
    const { data, error } = await supabase
        .from('tblusers')
        .select('*')
        .order('first_name', { ascending: true });

    if (error) return res.status(500).json({ data: null, error: error.message });

    // Cache on Vercel Edge for 1 hour
    // res.setHeader(
    //     'Cache-Control', 
    //     'public, max-age=300, s-maxage=3600, stale-while-revalidate=600'
    // );

    return res.status(200).json({ data });
}

async function getUsers(res){
    const { data, error } = await supabase
        .from('tblusers')
        .select('*')
        .neq('first_name', 'Admin')
        .order('first_name', { ascending: true });

    if (error) return res.status(500).json({ data: null, error: error.message });

    // Cache on Vercel Edge for 1 hour
    // res.setHeader(
    //     'Cache-Control', 
    //     'public, max-age=300, s-maxage=3600, stale-while-revalidate=600'
    // );

    const sanitized = data.map(({ password, ...rest }) => rest);

    return res.status(200).json({ data: sanitized });
}

async function getIntroRequests(res){
    const { data, error } = await supabase
        .from('tblintrorequests')
        .select('*');

    if (error) return res.status(500).json({ data: null, error: error.message });

    // Cache on Vercel Edge for 1 hour
    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=600'
    );

    return res.status(200).json({ data });
}

async function getSearchFilters(res){
    const { data, error } = await supabase
        .from('tblsearchfilters')
        .select('*');

    if (error) return res.status(500).json({ data: null, error: error.message });

    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=600'
    );

    return res.status(200).json({ data });
}

async function updateVendor(res, id, payload, description) {
    const { data, error } = await supabase
    .from('tblvendors')
    .update({ 
        data: payload,
        short_description: description,
        updated_at: new Date().toISOString()
    })
    .eq('id', id);

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function updateVendorCategories(res, id, categories) {
    const { data, error } = await supabase
    .from('tblvendors')
    .update({ 
        categories: categories,
        updated_at: new Date().toISOString()
    })
    .eq('id', id);

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function updateVendorProfile(res, id, payload) {
    const { data, error } = await supabase
    .from('tblvendors')
    .update(payload)
    .eq('id', id);
    
    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function updateVendorAutoRefresh(res, id, autoRefresh) {
    const { data, error } = await supabase
    .from('tblvendors')
    .update({ 
        auto_refresh: autoRefresh, 
        updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function getVendorById(res, id) {
  const { data, error } = await supabase
    .from('tblvendors')
    .select('*')
    .eq('id', id)
    .single();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function getReferencesByVendorId(res, vendorId) {
  const { data, error } = await supabase
    .from('tblreferences')
    .select('*')
    .eq('vendor_id', vendorId);

    if (error) return res.status(500).json({ data: null, error: error.message });

    return res.status(200).json({ data });
}

async function getVendorActivities(res, vendorIds) {
  const { data, error } = await supabase
    .from('tblactivities')
    .select('*')
    .in('vendor_id', vendorIds)
    .order('id', { ascending: false })
    .limit(5);

    if (error) return res.status(500).json({ data: null, error: error.message });

    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    );

    return res.status(200).json({ data });
}

async function getAllVendorActivities(res, vendorIds) {
  const { data, error } = await supabase
    .from('tblactivities')
    .select('*')
    .in('vendor_id', vendorIds);

    if (error) return res.status(500).json({ data: null, error: error.message });
    
    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    );

    return res.status(200).json({ data });
}

export async function addActivity(res, payload) {
    const { data, error } = await supabase
    .from('tblactivities')
    .insert(payload)
    .select()

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function addIntroRequest(res, vendorId, userId, message, mustHaves, targetImplementation, budgetIndication, title) {
    const { data, error } = await supabase
    .from('tblintrorequests')
    .insert({ 
        vendor_id: vendorId, 
        user_id: userId,
        message: message,
        must_haves: mustHaves,
        target_implementation: targetImplementation,
        budget_indication: budgetIndication
    })
    .select()

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function getReferencesById(res, id) {
  const { data, error } = await supabase
    .from('tblreferences')
    .select('*')
    .eq('id', id)
    .single();

    if (error) return res.status(500).json({ data: null, error: error.message });

    return res.status(200).json({ data });
}

export async function addReference(res, vendorId, customer, industry, status, validated) {
    const { data, error } = await supabase
    .from('tblreferences')
    .insert({ 
        vendor_id: vendorId, 
        customer: customer,
        industry: industry,
        status: status,
        validated: validated
    })
    .select()

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function addVisitor(res, payload) {
    const { data, error } = await supabase
    .from('tbldbvisitors')
    .upsert({ 
        name: payload['name'], 
        email:  payload['email'], 
        company_name: payload['company_name'], 
        country: payload['country'],
        headcount: payload['headcount'],
        ip_address: payload['ip_address']
    },
    { onConflict: 'email' })
    .select()
    .single();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function upsertFilter(res, payload) {
    const { data, error } = await supabase
    .from('tblsearchfilters')
    .upsert({ 
        ref: payload['ref'], 
        filters:  payload['filters'], 
        query: payload['query']
    },
    { onConflict: 'query' })
    .select()
    .single();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function addSearchMatches(res, payload) {
    const { data, error } = await supabase
    .from('tblsearchmatches')
    .upsert(payload,{ onConflict: 'query,vendor_id' })
    .select();
    
    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function saveEvaluation(res, payload) {
    const { data, error } = await supabase
    .from('tblevaluations')
    .upsert({ 
        user_id: payload.user_id, 
        criteria: payload.criteria, 
        vendor_id: payload.vendor_id, 
        vendor: payload.vendor,
        score: payload.score,
        overall: payload.overall      || 0,
        general_note: payload.generalNote  || '',
        next_steps: payload.nextSteps    || [],
    },
    { onConflict: 'user_id,vendor_id' })
    .select()
    .single();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function getFilter(res) {
    const { data, error } = await supabase
    .from('tblsearchfilters')
    .select('query');

    if (error) return res.status(500).json({ data: null, error: error.message });
    
    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    );

    return res.status(200).json({ data });
}

export async function userSignUp(res, user) {
    const hashedPassword = await bcrypt.hash(user['pwd'], 10);

    const { data: existing, error: checkError } = await supabase
        .from('tblusers')
        .select('id, verified, email, otp')
        .eq('email', user['email'])
        .maybeSingle();

    if (checkError) {
        return res.status(500).json({
            error: checkError.message
        });
    }

    if (existing) {
        if (existing.verified == 'N'){
            const token = jwt.sign(
                existing,
                process.env.JWT_SECRET,
                { expiresIn: '10m' }
            );

            existing['token'] = token;
            const data = existing;

            return res.status(200).json({ data });
        }

        return res.status(409).json({
            error: 'User already exists'
        });
    }

    const { data, error } = await supabase
    .from('tblusers')
    .insert({ 
        first_name: user['fname'], 
        last_name: user['lname'],
        email: user['email'], 
        password: hashedPassword, 
        role: user['role'], 
        otp: user['otp'],
        categories_of_interests: user['pref_categories'],
        geolocation_of_interest: user['pref_geo'],
        organization_size: user['pref_org_size']
    })
    .select('id, verified, email, otp')
    .single();

    if (error) return res.status(500).json({ data: null, error: error.message });
    
    const token = jwt.sign(
        data,
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );

    data['token'] = token;

    if (user['claim_vendor_id'] != ''){
        const { error: claimError} = await addVendorClaim(data.id, user['claim_vendor_id']);
        if (claimError) data['claim_error'] = claimError.message;
    }else{
        // because it is either or, not both
        if (user['new_listing_url'] != ''){
            const { error: newReqClaim} = await addVendorRequest(data.id, user['new_listing_url']);
            if (newReqClaim) data['request_error'] = newReqClaim.message;
        }
    }
   
    return res.status(200).json({ data });
}

async function createVendor(res, payload) {
    const { data: existing, error: checkError } = await supabase
        .from('tblvendors')
        .select('id, name')
        .ilike('name', payload.name)
        .limit(1);

    if (checkError) return res.status(500).json({ data: null, error: checkError.message });
    if (existing && existing.length > 0) {
        return res.status(409).json({ data: null, error: `A vendor named "${payload.name}" already exists.` });
    }

    const { data, error } = await supabase
        .from('tblvendors')
        .insert(payload)
        .select();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function submitVendorClaim(res, payload) {
    if (payload.option == 'new'){
        const { data, error } = await addVendorRequest(payload.userId, payload.url);
        if (error) return res.status(500).json({ data: null, error: error.message });

        return res.status(200).json({ data });
    }else{
        const { data, error } = await addVendorClaim(payload.userId, payload.vendorId);
        if (error) return res.status(500).json({ data: null, error: error.message });

        return res.status(200).json({ data });
    }
}

async function createUser(res, payload) {
  const { data: exists, error: existsError } = await supabase
    .from('tblusers')
    .select('*')
    .eq('email', payload.email)
    .maybeSingle();

    if (existsError) return res.status(500).json({ data: null, error: existsError.message });
    if (exists !== null) return res.status(500).json({ data: null, error: 'User with the same email address exists.' });

    const { data, error } = await supabase
    .from('tblusers')
    .insert(payload);

    if (error) return res.status(500).json({ data: null, error: error.message });

    return res.status(200).json({ success: true });
}

async function getUserByEmail(res, email) {
  const { data, error } = await supabase
    .from('tblusers')
    .select('*')
    .eq('email', email)
    .maybeSingle();

    if (error) return res.status(500).json({ data: null, error: error.message });

    res.setHeader(
        'Cache-Control', 
        'private, max-age=60'
    );

    return res.status(200).json({ data });
}

async function getAssignedVendorIds(res){
    const { data, error } = await supabase
    .from('tblusers')
    .select('vendor_ids')
    .not('vendor_ids', 'is', null)
    .neq('vendor_ids', '{}');
    
    if (error) return res.status(500).json({ data: null, error: error.message });
    
    const ids = data.flatMap(row => row.vendor_ids ?? []);

    return { ids, error: null };
}

async function getUserById(res, id) {
  const { data, error } = await supabase
    .from('tblusers')
    .select('first_name, last_name, email, role, verified, vendor_ids, id, auto_refresh, categories_of_interests, geolocation_of_interest, organization_size, organization, primary_region, phone, job_title')
    .eq('id', id)
    .maybeSingle();

    if (error) return res.status(500).json({ data: null, error: error.message });

    res.setHeader(
        'Cache-Control', 
        'private, max-age=60'
    );

    return res.status(200).json({ data });
}

async function updateOtp(res, id, otp) {
    const { data, error } = await supabase
    .from('tblusers')
    .update({ 
        otp: otp, 
    })
    .eq('id', id)
    .select('email');

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function updateUserProfile(res, id, payload) {
    let updateData = {
        email: payload['email']
    };

    if (payload['password'] && payload['password'].trim() !== '') {
        const hashedPassword = await bcrypt.hash(payload['password'], 10);
        updateData['password'] = hashedPassword;
    }
    
    const { data, error } = await supabase
    .from('tblusers')
    .update(updateData)
    .eq('id', id);

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function updatePersonalDetails(res, id, payload) {
    const { data, error } = await supabase
    .from('tblusers')
    .update(payload)
    .eq('id', id)
    .select('first_name, last_name, email, role, verified, vendor_ids, id, auto_refresh, categories_of_interests, geolocation_of_interest, organization_size, organization, primary_region, phone, job_title');

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function getNotificationPrefs(res, userId){
    const { data, error } = await supabase
    .from('tblnotificationpreferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function getAllEvaluations(res, userId){
    const { data, error } = await supabase
    .from('tblevaluations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function saveNotificationPrefs(res, user_id, prefs){
    const { data, error } = await supabase
    .from('tblnotificationpreferences')
    .upsert({ user_id, ...prefs }, { onConflict: 'user_id' })
    .select()
    .single();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function logEvent(res, userId, route){
    const date = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
    .from('tbllogs')
    .upsert({ user_id: userId, route: route, updated_date: date}, { onConflict: 'user_id' })
    .select()
    .single();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function updateUserPassword(res, email, oldPassword, newPassword) {
    const { data, error } = await supabase
    .from('tblusers')
    .select('id, password')
    .eq('email', email)
    .maybeSingle();

    if (error) return res.status(500).json({ data: null, error: error.message });
    if (data === null) return res.status(500).json({ data: null, error: 'Invalid User.' });

    const match = await bcrypt.compare(oldPassword, data.password);
    if (!match){
        return res.status(401).json({ data: null, error: 'Invalid current password.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const { data: existing, error: checkError } = await supabase
    .from('tblusers')
    .update({ 
        password: hashedNewPassword, 
    })
    .eq('email', email);

    if (checkError) return res.status(500).json({ data: null, error: checkError.message });
    return res.status(200).json({ existing });
}

async function updateVerification(res, verified, id) {
    const { data, error } = await supabase
    .from('tblusers')
    .update({ 
        verified: verified, 
    })
    .eq('id', id);

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function login(req, res, email, password) {
    const { data, error } = await supabase
    .from('tblusers')
    .select('id, password, role, requires_otp, email')
    .eq('email', email)
    .eq('verified', 'Y')
    .eq('active', true)
    .maybeSingle();

    if (error) return res.status(500).json({ data: null, error: error.message });
   
    if (data !== null){
        const match = await bcrypt.compare(password, data.password);
        if (!match){
            return res.status(401).json({ data: null, error: 'Invalid login details.' });
        }

        const token = crypto.randomUUID();
        const { data: sessionData, error: sessionError } = await supabase
            .from('tblsessions')
            .insert({
                session_id: token,
                user_id: data.id
            })
            .select('*');

        res.setHeader("Set-Cookie", serialize("auth", token, {
            httpOnly: true,
            secure: req.headers.host.includes('localhost') ? false : true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7 // 7 days
        }));
        
        if (data.requires_otp){
            const otp = Math.floor(100000 + Math.random() * 900000);
            const access_token = jwt.sign(
                {otp: otp, user_id: data.id},
                process.env.JWT_SECRET,
                { expiresIn: '30m' }
            );

            data['token'] = access_token;
        }

        delete data.password;

        return res.status(200).json({ data });
    }

    return res.status(401).json({ data: null, error: 'Invalid login details.' });
}

async function getUserClaim(res, userId){
    let claim;

    const { data, error } = await supabase
        .from('tblvendorclaims')
        .select('vendor_id, created_at, verified')
        .eq('user_id', userId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) return res.status(500).json({ data: null, error: error.message });
    if (data !== null){
        const { data: vendorClaimed, error: vendorClaimedError} = await supabase
            .from('tblvendors')
            .select('name')
            .eq('id', data.vendor_id)
            .maybeSingle();

        if (vendorClaimedError) return res.status(500).json({ data: null, error: vendorClaimedError.message });
        if (vendorClaimed === null) return res.status(500).json({ data: null, error: 'Error fetching claim.' });
        
        vendorClaimed.created_at = data.created_at;
        vendorClaimed.verified = data.verified;
        claim = vendorClaimed;
    }else{
        const { data: newListing, error: newListingError} = await supabase
            .from('tblvendorrequests')
            .select('website_url, status, created_at')
            .eq('user_id', userId)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (vendorClaimedError) return res.status(500).json({ data: null, error: newListingError.message });
        claim = newListing;
    }
    
    return res.status(200).json({ claim });
}

export async function addVendorClaim(userId, vendorId) {
    const { data: existing, error: checkError } = await supabase
        .from('tblvendorclaims')
        .select('id')
        .eq('user_id', userId)
        .eq('vendor_id', vendorId)
        .maybeSingle();

    if (checkError) return { data: null, error: checkError };
    if (existing) return { data: null, error: { message: 'A claim for this vendor already exists.' } };

    const { data, error } = await supabase
        .from('tblvendorclaims')
        .insert({ 
            user_id: userId, 
            vendor_id: vendorId 
        })
        .select('*')
        .single();

    return { data, error };
}

export async function addVendorRequest(userId, websiteUrl) {
    const { data: existing, error: checkError } = await supabase
        .from('tblvendorrequests')
        .select('id')
        .eq('user_id', userId)
        .eq('website_url', websiteUrl)
        .maybeSingle();

    if (checkError) return { data: null, error: checkError };
    if (existing) return { data: null, error: { message: 'A request for this vendor already exists.' } };

    const { data, error } = await supabase
        .from('tblvendorrequests')
        .upsert({ user_id: userId, website_url: websiteUrl },{ onConflict: 'user_id' })
        .select('*')
        .single();

    return { data, error };
}

export async function addToVendorAnalytics(res, vendorId, ipAddress) {
    const { data, error } = await supabase
    .from('tbldbanalytics')
    .insert({ 
        vendor_id: vendorId, 
        ip_address: ipAddress
    })
    .select()

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function getUserRequests(res, userId) {
    const { data, error } = await supabase
    .from('tblvendorrequests')
    .select('*')
    .eq('user_id', userId)
    .eq('crawled', 'N');

    if (error) return res.status(500).json({ data: null, error: error.message });
     return res.status(200).json({ data });
}

export async function getUserClaims(res, userId) {
    const { data, error } = await supabase
    .from('tblvendorclaims')
    .select('*')
    .eq('user_id', userId)
    .eq('verified', 'N');

    if (error) return res.status(500).json({ data: null, error: error.message });
     return res.status(200).json({ data });
}

export async function getVendorViewCount(res, vendorId) {
    const { count, error } = await supabase
    .from('tbldbanalytics')
    .select('*', {count: 'exact', head: true})
    .eq('vendor_id', vendorId)

    if (error) return res.status(500).json({ data: null, error: error.message });
     return res.status(200).json({ data: { vendorId, views: count } });
}

export async function getVendorViewCountLast7Days(res, vendorId) {
  const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count, error } = await supabase
        .from('tbldbanalytics')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .gte('created_at', sevenDaysAgo.toISOString()); 

    if (error) {
        return res.status(500).json({ data: null, error: error.message });
    }

    return res.status(200).json({ data: { vendorId, views_last_7_days: count } });
}

export async function getEvaluations(res, vendorId, userId) {
    const { data, error } = await supabase
    .from('tblevaluations')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('user_id', userId);

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function getVendorLeads(res, vendorIds) {
    const { data, error } = await supabase
    .from('tblintrorequests')
    .select('*')
    .in('vendor_id', vendorIds)
    .eq('pass', false)
    .eq('responded', false);

    if (error) return res.status(500).json({ data: null, error: error.message });

    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    );
    
    return res.status(200).json({ data });
}

export async function updateIntroRequest(res, id) {
    const { data, error } = await supabase
    .from('tblintrorequests')
    .update({ 
        viewed: true, 
    })
    .eq('id', id);

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function passIntroRequest(res, id) {
    const { data, error } = await supabase
    .from('tblintrorequests')
    .update({ 
        pass: true, 
    })
    .eq('id', id);

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function updateLead(res, id, payload) {
    const { data, error } = await supabase
    .from('tblintrorequests')
    .update(payload)
    .eq('id', id);

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function addVendorLead(res, vendorId, client) {
    const { data, error } = await supabase
    .from('tbldbleads')
    .insert({ 
        vendor_id: vendorId, 
        client_details: client
    })
    .select('*')
    .single();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function updateLeadStatus(res, id, status) {
    const { data, error } = await supabase
    .from('tbldbleads')
    .update({ 
        status: status, 
    })
    .eq('id', id);

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function getVendorViews(res, vendorId) {
    const { data, error } = await supabase
    .from('tbldbanalytics')
    .select('*')
    .eq('vendor_id', vendorId)

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

export async function verifyOtp(res, token, otp){
    if (!token) {
        return res.status(400).json({
            error: 'Token required'
        });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.id;

    const { data, error } = await supabase
    .from('tblusers')
    .select('*')
    .eq('id', id)
    .single();

    if (error) return res.status(500).json({ data: null, error: error.message });
    if (data.otp != otp){
        return res.status(500).json({ data: null, error: 'Invalid OTP.' });
    }

    const { error: updateError } = await supabase
    .from('tblusers')
    .update({ verified: 'Y' })
    .eq('id', id);

    if (updateError) return res.status(500).json({ data: null, error: updateError.message });

    return res.status(200).json({ message: 'success' });
}

async function GetVendorsForClaiming(res){
    let vendors = [];

    const {ids, error} = await getAssignedVendorIds(res);
    if (error) return res.status(500).json({ data: null, error: error.message });
   
    const { data, e } = await supabase
    .from('tblvendors')
    .select('*');
    
    if (e) return res.status(500).json({ data: null, error: e.message });
    
    if (data !== null){
        data.forEach(vendor => {
            if (vendor.data !== null && vendor.data.company !== null && !ids.includes(vendor.id)) vendors.push({id: vendor.id, name: vendor.name, url: vendor.data.company.website});
        });
    }
    
    return res.status(200).json({ vendors });
}

async function addClientInquiry(res, inquiry, client){
    const { data, error } = await supabase
    .from('tblclientinquiries')
    .insert({ 
        inquiry: inquiry,
        client: client
    })
    .select('*')
    .single();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function getComparisons(res, vendorId){
    const { data, error } = await supabase
        .from('tblcomparisons')
        .select('*')
        .eq('vendor_id', vendorId);

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function getClientEnquiries(res){
    const { data, error } = await supabase
        .from('tblclientinquiries')
        .select('*');

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function getUserComparisons(res, userId, vendorId){
    const { data, error } = await supabase
        .from('tblcomparisons')
        .select('*')
        .eq('user_id', userId)
        .neq('vendor_id', vendorId)
        .order('id', { ascending: false })
        .limit(2);

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function getSearchMatches(res, vendorIds){
    const { data, error } = await supabase
        .from('tblsearchmatches')
        .select('*')
        .in('vendor_id', vendorIds)
        .order('id', { ascending: false })
        .limit(5);

    if (error) return res.status(500).json({ data: null, error: error.message });

    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    );

    return res.status(200).json({ data });
}

async function addComparison(res, vendorId, userId){
    const { data, error } = await supabase
        .from('tblcomparisons')
        .insert({ 
            vendor_id: vendorId,
            user_id: userId
        })
        .select('*')
        .single();

    if (error) return res.status(500).json({ data: null, error: error.message });
    return res.status(200).json({ data });
}

async function getTopVendors(res, id) {
    const { data, error } = await supabase
        .from('tblactivities')
        .select('vendor_id')
        .neq('vendor_id', id);

    if (error) {
        return res.status(500).json({
            data: null,
            error: error.message
        });
    }

    const vendorCounts = {};

    data.forEach((row) => {
        if (row.vendor_id) {
            vendorCounts[row.vendor_id] =
                (vendorCounts[row.vendor_id] || 0) + 1;
        }
    });

    const topVendorIds = Object.entries(vendorCounts)
        .map(([vendor_id, count]) => ({
            vendor_id,
            count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

    const vendorIds = topVendorIds.map(v => v.vendor_id);

    const { data: vendors, error: vendorError } = await supabase
        .from('tblvendors')
        .select('*')
        .in('id', vendorIds);

    if (vendorError) {
        return res.status(500).json({
            data: null,
            error: vendorError.message
        });
    }

    const result = topVendorIds.map((topVendor) => {
        const vendorInfo = vendors.find(
            (v) => v.id == topVendor.vendor_id
        );

        return {
            ...vendorInfo,
            count: topVendor.count
        };
    });

    res.setHeader(
        'Cache-Control', 
        'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    );

    return res.status(200).json({
        data: result
    });
}

async function checkGuestLimit(res, sessionId) {
    const { data, error } = await supabase
        .from('tblguest_ai_usage')
        .select('*')
        .eq('session_id', sessionId)
        .single();

    if (error && error.code !== 'PGRST116') {
        return res.status(500).json({
            data: null,
            error: error
        });
    }

    if (!data) {
        await supabase
            .from('tblguest_ai_usage')
            .insert({
                session_id: sessionId,
                usage_count: 1
            });

        return res.status(200).json({
            allow: true
        });
    }

    if (data.usage_count >= 5) {
       return res.status(200).json({
            allow: false
        });
    }

    await supabase
        .from('tblguest_ai_usage')
        .update({
            usage_count: data.usage_count + 1,
            updated_at: new Date()
        })
        .eq('session_id', sessionId);

    return res.status(200).json({
        allow: true
    });
}