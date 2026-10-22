/*
 * HL7Forge — HL7 v2.x reference definitions (segments, fields, data types, code tables).
 * Static data only. Based on HL7 v2.5.1 naming; later versions add fields that are
 * displayed generically when not listed here.
 */
'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HL7Defs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Field lists are "Name:TYPE" strings, in sequence order starting at field 1.
  const SEGMENT_FIELDS = {
    MSH: ['Field Separator:ST', 'Encoding Characters:ST', 'Sending Application:HD', 'Sending Facility:HD',
      'Receiving Application:HD', 'Receiving Facility:HD', 'Date/Time of Message:TS', 'Security:ST',
      'Message Type:MSG', 'Message Control ID:ST', 'Processing ID:PT', 'Version ID:VID', 'Sequence Number:NM',
      'Continuation Pointer:ST', 'Accept Acknowledgment Type:ID', 'Application Acknowledgment Type:ID',
      'Country Code:ID', 'Character Set:ID', 'Principal Language of Message:CE',
      'Alternate Character Set Handling Scheme:ID', 'Message Profile Identifier:EI'],
    EVN: ['Event Type Code:ID', 'Recorded Date/Time:TS', 'Date/Time Planned Event:TS', 'Event Reason Code:IS',
      'Operator ID:XCN', 'Event Occurred:TS', 'Event Facility:HD'],
    PID: ['Set ID - PID:SI', 'Patient ID:CX', 'Patient Identifier List:CX', 'Alternate Patient ID - PID:CX',
      'Patient Name:XPN', "Mother's Maiden Name:XPN", 'Date/Time of Birth:TS', 'Administrative Sex:IS',
      'Patient Alias:XPN', 'Race:CE', 'Patient Address:XAD', 'County Code:IS', 'Phone Number - Home:XTN',
      'Phone Number - Business:XTN', 'Primary Language:CE', 'Marital Status:CE', 'Religion:CE',
      'Patient Account Number:CX', 'SSN Number - Patient:ST', "Driver's License Number - Patient:DLN",
      "Mother's Identifier:CX", 'Ethnic Group:CE', 'Birth Place:ST', 'Multiple Birth Indicator:ID',
      'Birth Order:NM', 'Citizenship:CE', 'Veterans Military Status:CE', 'Nationality:CE',
      'Patient Death Date and Time:TS', 'Patient Death Indicator:ID', 'Identity Unknown Indicator:ID',
      'Identity Reliability Code:IS', 'Last Update Date/Time:TS', 'Last Update Facility:HD', 'Species Code:CE',
      'Breed Code:CE', 'Strain:ST', 'Production Class Code:CE', 'Tribal Citizenship:CWE'],
    PD1: ['Living Dependency:IS', 'Living Arrangement:IS', 'Patient Primary Facility:XON',
      'Patient Primary Care Provider:XCN', 'Student Indicator:IS', 'Handicap:IS', 'Living Will Code:IS',
      'Organ Donor Code:IS', 'Separate Bill:ID', 'Duplicate Patient:CX', 'Publicity Code:CE',
      'Protection Indicator:ID', 'Protection Indicator Effective Date:DT', 'Place of Worship:XON',
      'Advance Directive Code:CE', 'Immunization Registry Status:IS',
      'Immunization Registry Status Effective Date:DT', 'Publicity Code Effective Date:DT',
      'Military Branch:IS', 'Military Rank/Grade:IS', 'Military Status:IS'],
    NK1: ['Set ID - NK1:SI', 'Name:XPN', 'Relationship:CE', 'Address:XAD', 'Phone Number:XTN',
      'Business Phone Number:XTN', 'Contact Role:CE', 'Start Date:DT', 'End Date:DT',
      'Next of Kin / Associated Parties Job Title:ST', 'Next of Kin / Associated Parties Job Code/Class:JCC',
      'Next of Kin / Associated Parties Employee Number:CX', 'Organization Name - NK1:XON', 'Marital Status:CE',
      'Administrative Sex:IS', 'Date/Time of Birth:TS', 'Living Dependency:IS', 'Ambulatory Status:IS',
      'Citizenship:CE', 'Primary Language:CE', 'Living Arrangement:IS', 'Publicity Code:CE',
      'Protection Indicator:ID', 'Student Indicator:IS', 'Religion:CE', "Mother's Maiden Name:XPN",
      'Nationality:CE', 'Ethnic Group:CE', 'Contact Reason:CE', "Contact Person's Name:XPN",
      "Contact Person's Telephone Number:XTN", "Contact Person's Address:XAD",
      "Next of Kin/Associated Party's Identifiers:CX", 'Job Status:IS', 'Race:CE', 'Handicap:IS',
      'Contact Person Social Security Number:ST', 'Next of Kin Birth Place:ST', 'VIP Indicator:IS'],
    PV1: ['Set ID - PV1:SI', 'Patient Class:IS', 'Assigned Patient Location:PL', 'Admission Type:IS',
      'Preadmit Number:CX', 'Prior Patient Location:PL', 'Attending Doctor:XCN', 'Referring Doctor:XCN',
      'Consulting Doctor:XCN', 'Hospital Service:IS', 'Temporary Location:PL', 'Preadmit Test Indicator:IS',
      'Re-admission Indicator:IS', 'Admit Source:IS', 'Ambulatory Status:IS', 'VIP Indicator:IS',
      'Admitting Doctor:XCN', 'Patient Type:IS', 'Visit Number:CX', 'Financial Class:FC',
      'Charge Price Indicator:IS', 'Courtesy Code:IS', 'Credit Rating:IS', 'Contract Code:IS',
      'Contract Effective Date:DT', 'Contract Amount:NM', 'Contract Period:NM', 'Interest Code:IS',
      'Transfer to Bad Debt Code:IS', 'Transfer to Bad Debt Date:DT', 'Bad Debt Agency Code:IS',
      'Bad Debt Transfer Amount:NM', 'Bad Debt Recovery Amount:NM', 'Delete Account Indicator:IS',
      'Delete Account Date:DT', 'Discharge Disposition:IS', 'Discharged to Location:DLD', 'Diet Type:CE',
      'Servicing Facility:IS', 'Bed Status:IS', 'Account Status:IS', 'Pending Location:PL',
      'Prior Temporary Location:PL', 'Admit Date/Time:TS', 'Discharge Date/Time:TS',
      'Current Patient Balance:NM', 'Total Charges:NM', 'Total Adjustments:NM', 'Total Payments:NM',
      'Alternate Visit ID:CX', 'Visit Indicator:IS', 'Other Healthcare Provider:XCN'],
    PV2: ['Prior Pending Location:PL', 'Accommodation Code:CE', 'Admit Reason:CE', 'Transfer Reason:CE',
      'Patient Valuables:ST', 'Patient Valuables Location:ST', 'Visit User Code:IS',
      'Expected Admit Date/Time:TS', 'Expected Discharge Date/Time:TS', 'Estimated Length of Inpatient Stay:NM',
      'Actual Length of Inpatient Stay:NM', 'Visit Description:ST', 'Referral Source Code:XCN',
      'Previous Service Date:DT', 'Employment Illness Related Indicator:ID', 'Purge Status Code:IS',
      'Purge Status Date:DT', 'Special Program Code:IS', 'Retention Indicator:ID',
      'Expected Number of Insurance Plans:NM', 'Visit Publicity Code:IS', 'Visit Protection Indicator:ID',
      'Clinic Organization Name:XON', 'Patient Status Code:IS', 'Visit Priority Code:IS',
      'Previous Treatment Date:DT', 'Expected Discharge Disposition:IS', 'Signature on File Date:DT',
      'First Similar Illness Date:DT', 'Patient Charge Adjustment Code:CE', 'Recurring Service Code:IS',
      'Billing Media Code:ID', 'Expected Surgery Date and Time:TS', 'Military Partnership Code:ID',
      'Military Non-Availability Code:ID', 'Newborn Baby Indicator:ID', 'Baby Detained Indicator:ID',
      'Mode of Arrival Code:CE', 'Recreational Drug Use Code:CE', 'Admission Level of Care Code:CE',
      'Precaution Code:CE', 'Patient Condition Code:CE', 'Living Will Code:IS', 'Organ Donor Code:IS',
      'Advance Directive Code:CE', 'Patient Status Effective Date:DT', 'Expected LOA Return Date/Time:TS',
      'Expected Pre-admission Testing Date/Time:TS', 'Notify Clergy Code:IS'],
    ORC: ['Order Control:ID', 'Placer Order Number:EI', 'Filler Order Number:EI', 'Placer Group Number:EI',
      'Order Status:ID', 'Response Flag:ID', 'Quantity/Timing:TQ', 'Parent:EIP', 'Date/Time of Transaction:TS',
      'Entered By:XCN', 'Verified By:XCN', 'Ordering Provider:XCN', "Enterer's Location:PL",
      'Call Back Phone Number:XTN', 'Order Effective Date/Time:TS', 'Order Control Code Reason:CE',
      'Entering Organization:CE', 'Entering Device:CE', 'Action By:XCN', 'Advanced Beneficiary Notice Code:CE',
      'Ordering Facility Name:XON', 'Ordering Facility Address:XAD', 'Ordering Facility Phone Number:XTN',
      'Ordering Provider Address:XAD', 'Order Status Modifier:CWE',
      'Advanced Beneficiary Notice Override Reason:CWE', "Filler's Expected Availability Date/Time:TS",
      'Confidentiality Code:CWE', 'Order Type:CWE', 'Enterer Authorization Mode:CNE',
      'Parent Universal Service Identifier:CWE'],
    OBR: ['Set ID - OBR:SI', 'Placer Order Number:EI', 'Filler Order Number:EI', 'Universal Service Identifier:CE',
      'Priority - OBR:ID', 'Requested Date/Time:TS', 'Observation Date/Time:TS', 'Observation End Date/Time:TS',
      'Collection Volume:CQ', 'Collector Identifier:XCN', 'Specimen Action Code:ID', 'Danger Code:CE',
      'Relevant Clinical Information:ST', 'Specimen Received Date/Time:TS', 'Specimen Source:SPS',
      'Ordering Provider:XCN', 'Order Callback Phone Number:XTN', 'Placer Field 1:ST', 'Placer Field 2:ST',
      'Filler Field 1:ST', 'Filler Field 2:ST', 'Results Rpt/Status Chng - Date/Time:TS',
      'Charge to Practice:MOC', 'Diagnostic Serv Sect ID:ID', 'Result Status:ID', 'Parent Result:PRL',
      'Quantity/Timing:TQ', 'Result Copies To:XCN', 'Parent:EIP', 'Transportation Mode:ID',
      'Reason for Study:CE', 'Principal Result Interpreter:NDL', 'Assistant Result Interpreter:NDL',
      'Technician:NDL', 'Transcriptionist:NDL', 'Scheduled Date/Time:TS', 'Number of Sample Containers:NM',
      'Transport Logistics of Collected Sample:CE', "Collector's Comment:CE",
      'Transport Arrangement Responsibility:CE', 'Transport Arranged:ID', 'Escort Required:ID',
      'Planned Patient Transport Comment:CE', 'Procedure Code:CE', 'Procedure Code Modifier:CE',
      'Placer Supplemental Service Information:CE', 'Filler Supplemental Service Information:CE',
      'Medically Necessary Duplicate Procedure Reason:CWE', 'Result Handling:IS',
      'Parent Universal Service Identifier:CWE'],
    OBX: ['Set ID - OBX:SI', 'Value Type:ID', 'Observation Identifier:CE', 'Observation Sub-ID:ST',
      'Observation Value:*', 'Units:CE', 'References Range:ST', 'Abnormal Flags:IS', 'Probability:NM',
      'Nature of Abnormal Test:ID', 'Observation Result Status:ID', 'Effective Date of Reference Range:TS',
      'User Defined Access Checks:ST', 'Date/Time of the Observation:TS', "Producer's ID:CE",
      'Responsible Observer:XCN', 'Observation Method:CE', 'Equipment Instance Identifier:EI',
      'Date/Time of the Analysis:TS', 'Observation Site:CWE', 'Observation Instance Identifier:EI',
      'Mood Code:CNE', 'Performing Organization Name:XON', 'Performing Organization Address:XAD',
      'Performing Organization Medical Director:XCN'],
    NTE: ['Set ID - NTE:SI', 'Source of Comment:ID', 'Comment:FT', 'Comment Type:CE'],
    AL1: ['Set ID - AL1:SI', 'Allergen Type Code:CE', 'Allergen Code/Mnemonic/Description:CE',
      'Allergy Severity Code:CE', 'Allergy Reaction Code:ST', 'Identification Date:DT'],
    DG1: ['Set ID - DG1:SI', 'Diagnosis Coding Method:ID', 'Diagnosis Code - DG1:CE', 'Diagnosis Description:ST',
      'Diagnosis Date/Time:TS', 'Diagnosis Type:IS', 'Major Diagnostic Category:CE',
      'Diagnostic Related Group:CE', 'DRG Approval Indicator:ID', 'DRG Grouper Review Code:IS',
      'Outlier Type:CE', 'Outlier Days:NM', 'Outlier Cost:CP', 'Grouper Version and Type:ST',
      'Diagnosis Priority:ID', 'Diagnosing Clinician:XCN', 'Diagnosis Classification:IS',
      'Confidential Indicator:ID', 'Attestation Date/Time:TS', 'Diagnosis Identifier:EI',
      'Diagnosis Action Code:ID'],
    PR1: ['Set ID - PR1:SI', 'Procedure Coding Method:IS', 'Procedure Code:CE', 'Procedure Description:ST',
      'Procedure Date/Time:TS', 'Procedure Functional Type:IS', 'Procedure Minutes:NM', 'Anesthesiologist:XCN',
      'Anesthesia Code:IS', 'Anesthesia Minutes:NM', 'Surgeon:XCN', 'Procedure Practitioner:XCN',
      'Consent Code:CE', 'Procedure Priority:ID', 'Associated Diagnosis Code:CE', 'Procedure Code Modifier:CE',
      'Procedure DRG Type:IS', 'Tissue Type Code:CE', 'Procedure Identifier:EI', 'Procedure Action Code:ID'],
    IN1: ['Set ID - IN1:SI', 'Insurance Plan ID:CE', 'Insurance Company ID:CX', 'Insurance Company Name:XON',
      'Insurance Company Address:XAD', 'Insurance Co Contact Person:XPN', 'Insurance Co Phone Number:XTN',
      'Group Number:ST', 'Group Name:XON', "Insured's Group Emp ID:CX", "Insured's Group Emp Name:XON",
      'Plan Effective Date:DT', 'Plan Expiration Date:DT', 'Authorization Information:AUI', 'Plan Type:IS',
      'Name of Insured:XPN', "Insured's Relationship to Patient:CE", "Insured's Date of Birth:TS",
      "Insured's Address:XAD", 'Assignment of Benefits:IS', 'Coordination of Benefits:IS',
      'Coord of Ben. Priority:ST', 'Notice of Admission Flag:ID', 'Notice of Admission Date:DT',
      'Report of Eligibility Flag:ID', 'Report of Eligibility Date:DT', 'Release Information Code:IS',
      'Pre-Admit Cert (PAC):ST', 'Verification Date/Time:TS', 'Verification By:XCN',
      'Type of Agreement Code:IS', 'Billing Status:IS', 'Lifetime Reserve Days:NM', 'Delay Before L.R. Day:NM',
      'Company Plan Code:IS', 'Policy Number:ST', 'Policy Deductible:CP', 'Policy Limit - Amount:CP',
      'Policy Limit - Days:NM', 'Room Rate - Semi-Private:CP', 'Room Rate - Private:CP',
      "Insured's Employment Status:CE", "Insured's Administrative Sex:IS", "Insured's Employer's Address:XAD",
      'Verification Status:ST', 'Prior Insurance Plan ID:IS', 'Coverage Type:IS', 'Handicap:IS',
      "Insured's ID Number:CX", 'Signature Code:IS', 'Signature Code Date:DT', "Insured's Birth Place:ST",
      'VIP Indicator:IS'],
    GT1: ['Set ID - GT1:SI', 'Guarantor Number:CX', 'Guarantor Name:XPN', 'Guarantor Spouse Name:XPN',
      'Guarantor Address:XAD', 'Guarantor Ph Num - Home:XTN', 'Guarantor Ph Num - Business:XTN',
      'Guarantor Date/Time of Birth:TS', 'Guarantor Administrative Sex:IS', 'Guarantor Type:IS',
      'Guarantor Relationship:CE', 'Guarantor SSN:ST', 'Guarantor Date - Begin:DT', 'Guarantor Date - End:DT',
      'Guarantor Priority:NM', 'Guarantor Employer Name:XPN', 'Guarantor Employer Address:XAD',
      'Guarantor Employer Phone Number:XTN', 'Guarantor Employee ID Number:CX',
      'Guarantor Employment Status:IS'],
    MSA: ['Acknowledgment Code:ID', 'Message Control ID:ST', 'Text Message:ST', 'Expected Sequence Number:NM',
      'Delayed Acknowledgment Type:ID', 'Error Condition:CE'],
    ERR: ['Error Code and Location:ELD', 'Error Location:ERL', 'HL7 Error Code:CWE', 'Severity:ID',
      'Application Error Code:CWE', 'Application Error Parameter:ST', 'Diagnostic Information:TX',
      'User Message:TX', 'Inform Person Indicator:IS', 'Override Type:CWE', 'Override Reason Code:CWE',
      'Help Desk Contact Point:XTN'],
    MRG: ['Prior Patient Identifier List:CX', 'Prior Alternate Patient ID:CX', 'Prior Patient Account Number:CX',
      'Prior Patient ID:CX', 'Prior Visit Number:CX', 'Prior Alternate Visit ID:CX', 'Prior Patient Name:XPN'],
    RXA: ['Give Sub-ID Counter:NM', 'Administration Sub-ID Counter:NM', 'Date/Time Start of Administration:TS',
      'Date/Time End of Administration:TS', 'Administered Code:CE', 'Administered Amount:NM',
      'Administered Units:CE', 'Administered Dosage Form:CE', 'Administration Notes:CE',
      'Administering Provider:XCN', 'Administered-at Location:LA2', 'Administered Per (Time Unit):ST',
      'Administered Strength:NM', 'Administered Strength Units:CE', 'Substance Lot Number:ST',
      'Substance Expiration Date:TS', 'Substance Manufacturer Name:CE', 'Substance/Treatment Refusal Reason:CE',
      'Indication:CE', 'Completion Status:ID', 'Action Code - RXA:ID', 'System Entry Date/Time:TS'],
    RXR: ['Route:CE', 'Administration Site:CWE', 'Administration Device:CE', 'Administration Method:CWE',
      'Routing Instruction:CE', 'Administration Site Modifier:CWE'],
    SPM: ['Set ID - SPM:SI', 'Specimen ID:EIP', 'Specimen Parent IDs:EIP', 'Specimen Type:CWE',
      'Specimen Type Modifier:CWE', 'Specimen Additives:CWE', 'Specimen Collection Method:CWE',
      'Specimen Source Site:CWE', 'Specimen Source Site Modifier:CWE', 'Specimen Collection Site:CWE',
      'Specimen Role:CWE', 'Specimen Collection Amount:CQ', 'Grouped Specimen Count:NM',
      'Specimen Description:ST', 'Specimen Handling Code:CWE', 'Specimen Risk Code:CWE',
      'Specimen Collection Date/Time:DR', 'Specimen Received Date/Time:TS', 'Specimen Expiration Date/Time:TS',
      'Specimen Availability:ID', 'Specimen Reject Reason:CWE', 'Specimen Quality:CWE',
      'Specimen Appropriateness:CWE', 'Specimen Condition:CWE', 'Specimen Current Quantity:CQ',
      'Number of Specimen Containers:NM', 'Container Type:CWE', 'Container Condition:CWE',
      'Specimen Child Role:CWE'],
    BHS: ['Batch Field Separator:ST', 'Batch Encoding Characters:ST', 'Batch Sending Application:HD',
      'Batch Sending Facility:HD', 'Batch Receiving Application:HD', 'Batch Receiving Facility:HD',
      'Batch Creation Date/Time:TS', 'Batch Security:ST', 'Batch Name/ID/Type:ST', 'Batch Comment:ST',
      'Batch Control ID:ST', 'Reference Batch Control ID:ST'],
    FHS: ['File Field Separator:ST', 'File Encoding Characters:ST', 'File Sending Application:HD',
      'File Sending Facility:HD', 'File Receiving Application:HD', 'File Receiving Facility:HD',
      'File Creation Date/Time:TS', 'File Security:ST', 'File Name/ID:ST', 'File Header Comment:ST',
      'File Control ID:ST', 'Reference File Control ID:ST'],
    BTS: ['Batch Message Count:ST', 'Batch Comment:ST', 'Batch Totals:NM'],
    FTS: ['File Batch Count:NM', 'File Trailer Comment:ST'],
  };

  const SEGMENT_NAMES = {
    ACC: 'Accident', AIG: 'Appointment Information - General Resource', AIL: 'Appointment Information - Location',
    AIP: 'Appointment Information - Personnel', AIS: 'Appointment Information - Service', AL1: 'Patient Allergy Information',
    BHS: 'Batch Header', BTS: 'Batch Trailer', DG1: 'Diagnosis', DRG: 'Diagnosis Related Group',
    ERR: 'Error', EVN: 'Event Type', FHS: 'File Header', FT1: 'Financial Transaction', FTS: 'File Trailer',
    GT1: 'Guarantor', IAM: 'Patient Adverse Reaction Information', IN1: 'Insurance', IN2: 'Insurance Additional Information',
    IN3: 'Insurance Additional Information, Certification', MRG: 'Merge Patient Information',
    MSA: 'Message Acknowledgment', MSH: 'Message Header', NK1: 'Next of Kin / Associated Parties', NTE: 'Notes and Comments',
    OBR: 'Observation Request', OBX: 'Observation/Result', ORC: 'Common Order', PD1: 'Patient Additional Demographic',
    PDA: 'Patient Death and Autopsy', PID: 'Patient Identification', PR1: 'Procedures', PV1: 'Patient Visit',
    PV2: 'Patient Visit - Additional Information', QAK: 'Query Acknowledgment', QPD: 'Query Parameter Definition',
    QRD: 'Original-Style Query Definition', QRF: 'Original-Style Query Filter', RCP: 'Response Control Parameter',
    RGS: 'Resource Group', ROL: 'Role', RXA: 'Pharmacy/Treatment Administration', RXC: 'Pharmacy/Treatment Component Order',
    RXD: 'Pharmacy/Treatment Dispense', RXE: 'Pharmacy/Treatment Encoded Order', RXO: 'Pharmacy/Treatment Order',
    RXR: 'Pharmacy/Treatment Route', SCH: 'Scheduling Activity Information', SFT: 'Software Segment',
    SPM: 'Specimen', TQ1: 'Timing/Quantity', TQ2: 'Timing/Quantity Relationship', TXA: 'Transcription Document Header',
    UB1: 'UB82', UB2: 'Uniform Billing Data',
  };

  const DATA_TYPES = {
    AUI: ['Authorization Number', 'Date', 'Source'],
    CE: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text',
      'Name of Alternate Coding System'],
    CNE: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text',
      'Name of Alternate Coding System', 'Coding System Version ID', 'Alternate Coding System Version ID', 'Original Text'],
    CWE: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text',
      'Name of Alternate Coding System', 'Coding System Version ID', 'Alternate Coding System Version ID', 'Original Text'],
    CP: ['Price', 'Price Type', 'From Value', 'To Value', 'Range Units', 'Range Type'],
    CQ: ['Quantity', 'Units'],
    CX: ['ID Number', 'Check Digit', 'Check Digit Scheme', 'Assigning Authority', 'Identifier Type Code',
      'Assigning Facility', 'Effective Date', 'Expiration Date', 'Assigning Jurisdiction', 'Assigning Agency or Department'],
    DLD: ['Discharge Location', 'Effective Date'],
    DLN: ['License Number', 'Issuing State, Province, Country', 'Expiration Date'],
    DR: ['Range Start Date/Time', 'Range End Date/Time'],
    EI: ['Entity Identifier', 'Namespace ID', 'Universal ID', 'Universal ID Type'],
    EIP: ['Placer Assigned Identifier', 'Filler Assigned Identifier'],
    ELD: ['Segment ID', 'Segment Sequence', 'Field Position', 'Code Identifying Error'],
    ERL: ['Segment ID', 'Segment Sequence', 'Field Position', 'Field Repetition', 'Component Number', 'Sub-Component Number'],
    FC: ['Financial Class Code', 'Effective Date'],
    HD: ['Namespace ID', 'Universal ID', 'Universal ID Type'],
    JCC: ['Job Code', 'Job Class', 'Job Description Text'],
    MOC: ['Monetary Amount', 'Charge Code'],
    MSG: ['Message Code', 'Trigger Event', 'Message Structure'],
    NDL: ['Name', 'Start Date/Time', 'End Date/Time', 'Point of Care', 'Room', 'Bed', 'Facility', 'Location Status',
      'Patient Location Type', 'Building', 'Floor'],
    PL: ['Point of Care', 'Room', 'Bed', 'Facility', 'Location Status', 'Person Location Type', 'Building', 'Floor',
      'Location Description', 'Comprehensive Location Identifier', 'Assigning Authority for Location'],
    PRL: ['Parent Observation Identifier', 'Parent Observation Sub-Identifier', 'Parent Observation Value Descriptor'],
    PT: ['Processing ID', 'Processing Mode'],
    SN: ['Comparator', 'Num1', 'Separator/Suffix', 'Num2'],
    SPS: ['Specimen Source Name or Code', 'Additives', 'Specimen Collection Method', 'Body Site', 'Site Modifier',
      'Collection Method Modifier Code', 'Specimen Role'],
    TQ: ['Quantity', 'Interval', 'Duration', 'Start Date/Time', 'End Date/Time', 'Priority', 'Condition', 'Text',
      'Conjunction', 'Order Sequencing', 'Occurrence Duration', 'Total Occurrences'],
    TS: ['Time', 'Degree of Precision'],
    VID: ['Version ID', 'Internationalization Code', 'International Version ID'],
    XAD: ['Street Address', 'Other Designation', 'City', 'State or Province', 'Zip or Postal Code', 'Country',
      'Address Type', 'Other Geographic Designation', 'County/Parish Code', 'Census Tract', 'Address Representation Code',
      'Address Validity Range', 'Effective Date', 'Expiration Date'],
    XCN: ['ID Number', 'Family Name', 'Given Name', 'Second and Further Given Names or Initials', 'Suffix', 'Prefix',
      'Degree', 'Source Table', 'Assigning Authority', 'Name Type Code', 'Identifier Check Digit', 'Check Digit Scheme',
      'Identifier Type Code', 'Assigning Facility', 'Name Representation Code', 'Name Context', 'Name Validity Range',
      'Name Assembly Order', 'Effective Date', 'Expiration Date', 'Professional Suffix', 'Assigning Jurisdiction',
      'Assigning Agency or Department'],
    XON: ['Organization Name', 'Organization Name Type Code', 'ID Number', 'Check Digit', 'Check Digit Scheme',
      'Assigning Authority', 'Identifier Type Code', 'Assigning Facility', 'Name Representation Code',
      'Organization Identifier'],
    XPN: ['Family Name', 'Given Name', 'Second and Further Given Names or Initials', 'Suffix', 'Prefix', 'Degree',
      'Name Type Code', 'Name Representation Code', 'Name Context', 'Name Validity Range', 'Name Assembly Order',
      'Effective Date', 'Expiration Date', 'Professional Suffix'],
    XTN: ['Telephone Number', 'Telecommunication Use Code', 'Telecommunication Equipment Type', 'Email Address',
      'Country Code', 'Area/City Code', 'Local Number', 'Extension', 'Any Text', 'Extension Prefix', 'Speed Dial Code',
      'Unformatted Telephone Number'],
  };

  const DATA_TYPE_NAMES = {
    CE: 'Coded Element', CNE: 'Coded with No Exceptions', CWE: 'Coded with Exceptions', CP: 'Composite Price',
    CQ: 'Composite Quantity with Units', CX: 'Extended Composite ID with Check Digit', DT: 'Date', DTM: 'Date/Time',
    EI: 'Entity Identifier', FT: 'Formatted Text', HD: 'Hierarchic Designator', ID: 'Coded Value (HL7 table)',
    IS: 'Coded Value (user table)', MSG: 'Message Type', NM: 'Numeric', PL: 'Person Location', PT: 'Processing Type',
    SI: 'Sequence ID', SN: 'Structured Numeric', ST: 'String', TM: 'Time', TS: 'Time Stamp', TX: 'Text Data',
    VID: 'Version Identifier', XAD: 'Extended Address', XCN: 'Extended Composite ID Number and Name for Persons',
    XON: 'Extended Composite Name and ID for Organizations', XPN: 'Extended Person Name',
    XTN: 'Extended Telecommunication Number',
  };

  const TABLES = {
    sex: { F: 'Female', M: 'Male', O: 'Other', U: 'Unknown', A: 'Ambiguous', N: 'Not applicable' },
    patientClass: { E: 'Emergency', I: 'Inpatient', O: 'Outpatient', P: 'Preadmit', R: 'Recurring patient',
      B: 'Obstetrics', C: 'Commercial account', N: 'Not applicable', U: 'Unknown' },
    ackCode: { AA: 'Application Accept', AE: 'Application Error', AR: 'Application Reject',
      CA: 'Commit Accept', CE: 'Commit Error', CR: 'Commit Reject' },
    processingId: { P: 'Production', T: 'Training', D: 'Debugging' },
    resultStatus: { C: 'Corrected', D: 'Deleted', F: 'Final', I: 'Pending (specimen in lab)', N: 'Not asked',
      O: 'Order detail only', P: 'Preliminary', R: 'Not verified', S: 'Partial', U: 'Status changed to final',
      W: 'Wrong (post original as wrong)', X: 'Cannot be obtained' },
    orderResultStatus: { O: 'Order received', I: 'No results available; specimen received',
      S: 'No results available; procedure scheduled', A: 'Some, not all, results available', P: 'Preliminary',
      C: 'Correction', R: 'Results stored; not verified', F: 'Final', X: 'No results available; order canceled',
      Y: 'No order on record', Z: 'No record of this patient' },
    abnormalFlags: { L: 'Below low normal', H: 'Above high normal', LL: 'Below lower panic limits',
      HH: 'Above upper panic limits', N: 'Normal', A: 'Abnormal', AA: 'Very abnormal', U: 'Significant change up',
      D: 'Significant change down', B: 'Better', W: 'Worse', S: 'Susceptible', R: 'Resistant', I: 'Intermediate',
      '<': 'Below absolute low-off instrument scale', '>': 'Above absolute high-off instrument scale' },
    valueType: { CE: 'Coded Element', CWE: 'Coded with Exceptions', DT: 'Date', ED: 'Encapsulated Data',
      FT: 'Formatted Text', NM: 'Numeric', SN: 'Structured Numeric', ST: 'String', TM: 'Time', TS: 'Time Stamp',
      DTM: 'Date/Time', TX: 'Text', RP: 'Reference Pointer', XPN: 'Person Name', XAD: 'Address', XCN: 'Person (ID & name)' },
    orderControl: { NW: 'New order', OK: 'Order accepted', CA: 'Cancel order request', CR: 'Canceled as requested',
      DC: 'Discontinue order request', XO: 'Change order request', XX: 'Changed as requested', SC: 'Status changed',
      RE: 'Observations to follow', SN: 'Send order number', NA: 'Number assigned', HD: 'Hold order request',
      RL: 'Release previous hold', OC: 'Order canceled', OD: 'Order discontinued', RP: 'Order replace request',
      RU: 'Replaced unsolicited', UA: 'Unable to accept order' },
    yesNo: { Y: 'Yes', N: 'No' },
    ackType: { AL: 'Always', NE: 'Never', ER: 'Error/reject conditions only', SU: 'Successful completion only' },
    maritalStatus: { A: 'Separated', D: 'Divorced', M: 'Married', S: 'Single', W: 'Widowed', C: 'Common law',
      G: 'Living together', P: 'Domestic partner', R: 'Registered domestic partner', E: 'Legally separated',
      N: 'Annulled', I: 'Interlocutory', B: 'Unmarried', U: 'Unknown', O: 'Other', T: 'Unreported' },
    admissionType: { A: 'Accident', E: 'Emergency', L: 'Labor and delivery', R: 'Routine', N: 'Newborn',
      U: 'Urgent', C: 'Elective' },
    allergenType: { DA: 'Drug allergy', FA: 'Food allergy', MA: 'Miscellaneous allergy', MC: 'Miscellaneous contraindication',
      EA: 'Environmental allergy', AA: 'Animal allergy', PA: 'Plant allergy', LA: 'Pollen allergy' },
    allergySeverity: { SV: 'Severe', MO: 'Moderate', MI: 'Mild', U: 'Unknown' },
    errorSeverity: { E: 'Error', W: 'Warning', I: 'Information', F: 'Fatal error' },
    diagnosisType: { A: 'Admitting', W: 'Working', F: 'Final' },
  };

  // Maps "SEG-n" to a TABLES key, used to show the meaning of coded values.
  const FIELD_TABLES = {
    'MSH-11': 'processingId', 'MSH-15': 'ackType', 'MSH-16': 'ackType',
    'PID-8': 'sex', 'PID-16': 'maritalStatus', 'PID-24': 'yesNo', 'PID-30': 'yesNo',
    'NK1-15': 'sex', 'NK1-14': 'maritalStatus', 'IN1-43': 'sex', 'GT1-9': 'sex',
    'PV1-2': 'patientClass', 'PV1-4': 'admissionType',
    'MSA-1': 'ackCode', 'ERR-4': 'errorSeverity',
    'OBX-2': 'valueType', 'OBX-8': 'abnormalFlags', 'OBX-11': 'resultStatus',
    'OBR-25': 'orderResultStatus', 'ORC-1': 'orderControl',
    'AL1-2': 'allergenType', 'AL1-4': 'allergySeverity', 'DG1-6': 'diagnosisType',
  };

  const EVENTS = {
    'ACK': 'General acknowledgment',
    'ADT^A01': 'Admit/visit notification', 'ADT^A02': 'Transfer a patient', 'ADT^A03': 'Discharge/end visit',
    'ADT^A04': 'Register a patient', 'ADT^A05': 'Pre-admit a patient', 'ADT^A06': 'Change an outpatient to an inpatient',
    'ADT^A07': 'Change an inpatient to an outpatient', 'ADT^A08': 'Update patient information',
    'ADT^A09': 'Patient departing - tracking', 'ADT^A10': 'Patient arriving - tracking', 'ADT^A11': 'Cancel admit/visit notification',
    'ADT^A12': 'Cancel transfer', 'ADT^A13': 'Cancel discharge/end visit', 'ADT^A14': 'Pending admit',
    'ADT^A15': 'Pending transfer', 'ADT^A16': 'Pending discharge', 'ADT^A17': 'Swap patients',
    'ADT^A18': 'Merge patient information', 'ADT^A20': 'Bed status update', 'ADT^A21': 'Patient goes on a leave of absence',
    'ADT^A22': 'Patient returns from a leave of absence', 'ADT^A23': 'Delete a patient record', 'ADT^A24': 'Link patient information',
    'ADT^A25': 'Cancel pending discharge', 'ADT^A26': 'Cancel pending transfer', 'ADT^A27': 'Cancel pending admit',
    'ADT^A28': 'Add person information', 'ADT^A29': 'Delete person information', 'ADT^A30': 'Merge person information',
    'ADT^A31': 'Update person information', 'ADT^A34': 'Merge patient information - patient ID only',
    'ADT^A37': 'Unlink patient information', 'ADT^A38': 'Cancel pre-admit', 'ADT^A39': 'Merge person - patient ID',
    'ADT^A40': 'Merge patient - patient identifier list', 'ADT^A41': 'Merge account - patient account number',
    'ADT^A44': 'Move account information', 'ADT^A45': 'Move visit information', 'ADT^A47': 'Change patient identifier list',
    'ADT^A60': 'Update allergy information',
    'ORM^O01': 'General order message', 'OML^O21': 'Laboratory order', 'ORR^O02': 'General order response',
    'ORU^R01': 'Unsolicited observation result', 'ORU^R30': 'Unsolicited point-of-care observation',
    'OUL^R22': 'Unsolicited specimen oriented observation', 'MDM^T01': 'Original document notification',
    'MDM^T02': 'Original document notification and content', 'MDM^T08': 'Document edit notification and content',
    'SIU^S12': 'Notification of new appointment booking', 'SIU^S13': 'Notification of appointment rescheduling',
    'SIU^S14': 'Notification of appointment modification', 'SIU^S15': 'Notification of appointment cancellation',
    'SIU^S26': 'Notification that patient did not show up', 'DFT^P03': 'Post detail financial transaction',
    'BAR^P01': 'Add patient accounts', 'VXU^V04': 'Unsolicited vaccination record update',
    'RDE^O11': 'Pharmacy/treatment encoded order', 'RAS^O17': 'Pharmacy/treatment administration',
    'QBP^Q11': 'Query by parameter', 'RSP^K11': 'Segment pattern response', 'MFN^M02': 'Master file - staff practitioner',
  };

  function expandFields(list) {
    return list.map(function (entry) {
      const i = entry.lastIndexOf(':');
      return { name: entry.slice(0, i), type: entry.slice(i + 1) };
    });
  }

  const SEGMENTS = {};
  Object.keys(SEGMENT_FIELDS).forEach(function (id) {
    SEGMENTS[id] = { name: SEGMENT_NAMES[id] || id, fields: expandFields(SEGMENT_FIELDS[id]) };
  });

  /**
   * Looks up a key that came from message data. Own properties only, so values such as
   * "__proto__" or "constructor" can't return Object.prototype members.
   */
  function own(table, key) {
    return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null;
  }

  function segmentName(id) {
    const name = own(SEGMENT_NAMES, id);
    if (name) return name;
    if (/^Z/.test(id)) return 'Custom (Z) segment';
    return 'Unknown segment';
  }

  function segment(id) {
    return own(SEGMENTS, id);
  }

  function fieldDef(segId, position) {
    const seg = own(SEGMENTS, segId);
    return seg ? seg.fields[position - 1] || null : null;
  }

  function componentName(type, index) {
    const comps = own(DATA_TYPES, type);
    return comps ? comps[index - 1] || null : null;
  }

  function dataTypeName(type) {
    return own(DATA_TYPE_NAMES, type);
  }

  function codeMeaning(segId, position, value) {
    const table = own(TABLES, own(FIELD_TABLES, segId + '-' + position));
    return table ? own(table, value) : null;
  }

  function eventName(code, trigger) {
    return own(EVENTS, code + '^' + trigger) || own(EVENTS, code);
  }

  return {
    SEGMENTS: SEGMENTS, DATA_TYPES: DATA_TYPES, DATA_TYPE_NAMES: DATA_TYPE_NAMES, TABLES: TABLES,
    segment: segment, segmentName: segmentName, fieldDef: fieldDef, componentName: componentName,
    dataTypeName: dataTypeName, codeMeaning: codeMeaning, eventName: eventName,
  };
});
