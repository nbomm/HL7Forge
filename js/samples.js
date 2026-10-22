/* HL7Forge — sample messages. All data is fictional. */
'use strict';
(function (root) {
  const samples = {
    adt: [
      'MSH|^~\\&|EPICADT|MERCYHOSP|LABSYS|MERCYLAB|20261021143005-0500||ADT^A01^ADT_A01|MSG00001|P|2.5.1|||AL|NE',
      'EVN|A01|20261021143000|||JSMITH^Smith^Jane^^^^^^MERCY',
      'PID|1||100234567^^^MERCY^MR~987-65-4320^^^SSA^SS||DOE^JOHN^QUINCY^JR^^^L||19800315|M||2106-3^White^CDCREC|123 MAIN ST^APT 4B^SPRINGFIELD^IL^62701^USA^H||^PRN^PH^^1^217^5551234~^NET^Internet^john.doe@example.com|||M||ACCT556677^^^MERCY^AN',
      'NK1|1|DOE^JANE^M|SPO^Spouse^HL70063|123 MAIN ST^APT 4B^SPRINGFIELD^IL^62701^USA|^PRN^PH^^1^217^5551235',
      'PV1|1|I|4WEST^412^B^MERCY||||1234^WELBY^MARCUS^^^DR^MD|5678^HOUSE^GREGORY^^^DR^MD||MED||||7|||1234^WELBY^MARCUS^^^DR^MD|IP|V445566^^^MERCY^VN|||||||||||||||||||||||||20261021140000',
      'AL1|1|DA|70618^Penicillin^RXNORM|SV|Hives',
      'DG1|1||R07.9^Chest pain, unspecified^I10|||A',
      'IN1|1|PPO100^Blue Choice PPO|BCBS01|BLUE CROSS BLUE SHIELD^^^^^^^^^IL|PO BOX 1000^^CHICAGO^IL^60601||^WPN^PH^^1^800^5550000|GRP7788|||||20260101|20261231|||DOE^JOHN^QUINCY|SEL^Self',
    ].join('\r'),
    oru: [
      'MSH|^~\\&|LABSYS|MERCYLAB|EPIC|MERCYHOSP|20261021160512||ORU^R01^ORU_R01|LAB778899|P|2.5.1',
      'PID|1||100234567^^^MERCY^MR||DOE^JOHN^QUINCY||19800315|M',
      'ORC|RE|ORD1001^EPIC|LAB2002^LABSYS||CM',
      'OBR|1|ORD1001^EPIC|LAB2002^LABSYS|80048^Basic Metabolic Panel^CPT|||20261021150000|||||||20261021151500||1234^WELBY^MARCUS^^^DR^MD||||||20261021160500|||F',
      'OBX|1|NM|2345-7^Glucose^LN||182|mg/dL^milligrams per deciliter^UCUM|70-99|H|||F|||20261021150000',
      'OBX|2|NM|2951-2^Sodium^LN||139|mmol/L^^UCUM|136-145|N|||F|||20261021150000',
      'OBX|3|NM|2823-3^Potassium^LN||3.1|mmol/L^^UCUM|3.5-5.1|L|||F|||20261021150000',
      'OBX|4|NM|2160-0^Creatinine^LN||1.0|mg/dL^^UCUM|0.7-1.3|N|||F|||20261021150000',
      'OBX|5|ST|8251-1^Service comment^LN||Specimen slightly hemolyzed \\T\\ re-check advised.||||||F',
      'NTE|1|L|Glucose drawn non-fasting.\\.br\\Please correlate clinically.',
    ].join('\r'),
    ack: [
      'MSH|^~\\&|LABSYS|MERCYLAB|EPICADT|MERCYHOSP|20261021143007||ACK^A01^ACK|ACK00001|P|2.5.1',
      'MSA|AE|MSG00001|Patient location not found',
      'ERR||PV1^1^3^1|103^Table value not found^HL70357|E',
    ].join('\r'),
  };
  root.HL7Samples = samples;
})(globalThis);
