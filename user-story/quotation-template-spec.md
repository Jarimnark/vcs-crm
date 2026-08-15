# Quotation Template Specification

**Derived from:** two live samples — QUO69054 (consumable, DELO DUALBOND AD4950) and QUO69041 (equipment, DELO-ACTIVIS 330 kit).

**Headline finding:** both project types use the **same template**. No separate service/equipment layouts are needed. This removes question Q12 from the previous list.

---

## 1. Page Structure

Six blocks, top to bottom.

```
┌─────────────────────────────────────────────────────────┐
│  [LOGO]   Company name TH / EN            ┌───────────┐ │
│           Address TH                      │ ใบเสนอราคา │ │
│           Address EN                      │ QUOTATION │ │
│           Tel                             └───────────┘ │
├──────────────────────────┬──────────────────────────────┤
│  Client box              │  Attention box               │
│  Company & address       │  Contact name                │
│  Tax ID + branch         │  Email, Tel, cc              │
├──────────────────────────┴──────────────────────────────┤
│  No. │ Date │ Validity │ Delivery │ Payment │ Salesperson│
├─────────────────────────────────────────────────────────┤
│  No. │ Description │ Qty │ Unit Price │ Discount │ Amount│
│      │  (item, components, image, terms)                │
│      │                                                  │
├──────────────────────────┬──────────────────────────────┤
│  Thank-you text TH / EN  │  Total / VAT 7% / Grand Total│
└──────────────────────────┴──────────────────────────────┘
```

---

## 2. Block Detail

### 2.1 Header
- Company logo (fixed asset)
- Company name in Thai and English
- Full address in Thai and English
- Telephone
- Red title box, top right: **ใบเสนอราคา / QUOTATION**

All fixed. Stored as company settings, not entered per quotation.

### 2.2 Client box (left)
Labels are bilingual (บริษัทและที่อยู่ / Company & Address).
- Company name
- Address, multi-line
- **Tax ID**, with **branch designation** — sample shows `0105566040011 (Head Office)`

Pulled from the Account record, editable per quotation. Branch designation is a Thai tax requirement and must be a stored field, not typed each time.

### 2.3 Attention box (right)
- Contact name (ถึง / Attention)
- Email
- Tel or Mobile
- **cc** — one or more additional names (present in QUO69041)

Pulled from the Person record. The cc field means a quotation references more than one contact, so this is a many-to-one relationship, not a single contact field.

### 2.4 Header bar
Six columns, bilingual labels.

| Field | Sample 1 | Sample 2 |
|---|---|---|
| เลขที่ / No. | QUO69054 | QUO69041 |
| วันที่ / Date | 15-07-26 | 7 May 2026 |
| กำหนดยืนราคา / Validity | See below | Until 30/6/2026 |
| กำหนดส่งของ / Delivery Date | See Below | See below |
| กำหนดชำระเงิน / Payment Term | See Below | See below |
| พนักงานขาย / Sales Person | Chayutpon T. / 099-087 8038 | Chayutpon / 099-087 8038 |

**Two problems visible in the samples:**

1. **Date format is inconsistent** — `15-07-26` versus `7 May 2026`. The system should enforce one format. Recommend `DD/MM/YYYY` or an unambiguous long form, since `15-07-26` could be read three ways.

2. **"See below" is a workaround.** Validity, delivery date, and payment term are being pushed into the description cell because the bar has no room for long or conditional values. The system should handle this automatically: print the value in the bar when short, and print "See below" **only when the field's content exceeds the space**, rendering the full text into the terms block. The user should never have to type "See below" manually.

Sales person name and phone come from the logged-in user's profile.

### 2.5 Line item table

| Column | Thai label | Notes |
|---|---|---|
| No. | ลำดับที่ | Auto-numbered |
| Description | รายการสินค้า | Multi-part — see 2.6 |
| Min. Order Qty | จำนวนสั่งซื้อขั้นต่ำ | Quantity **and** unit in one column (`13 ea`, `1 SET`) |
| Unit Price | ราคาต่อหน่วย | |
| Discount | ส่วนลด | Prints `-` when none |
| Amount | จำนวนเงิน | Qty × unit price, less discount |

### 2.6 The Description cell — three distinct content types

This cell carries more than a product name, and it is the most important thing to model correctly.

**(a) Item line**
Item code followed by item name: `1749560 DELO DUALBOND® AD4950 600 g`

**(b) Component list — optional**
QUO69041 sells a kit and lists eleven components inside the description:
```
1 x 9070456 DELO-DIV VD330 VisChem HVC POM
1 x 9520442 DELO-ACTIVIS 330 v1.1
2 x 9520410 DELOLUX® 503 / 460 LP S1 v1
    without Powerguide for DELO-ACTIVIS
...
```
Each entry is quantity + code + name, with wrapping continuation lines. These components carry no individual price — they describe what is inside the priced set.

**(c) Product image — optional**
QUO69041 embeds a photo of the equipment, sized roughly one third of the table width, positioned beside the component list.

**(d) Terms block**
A set of underlined-label fields:

| Label | Sample 1 | Sample 2 |
|---|---|---|
| Currency | Thai Baht | Thai Baht |
| Validity | Until 30/8/2026 | *(in header bar)* |
| Lead time | Cannot be determined until the license is obtained. *(plus a paragraph on import permission)* | 6-8 weeks after receipt of delivery confirmation from manufacturer. |
| Incoterm(s) | DDP | DDP |
| Payment Term | Cash | 30 days after the date of invoice |
| Country of Origin | Germany | Germany |

Note the label inconsistency between samples: **Incoterm** versus **Incoterms**. The system should standardise this.

### 2.7 Footer
- Left: fixed bilingual thank-you text
- Right: **รวมเงิน / Total**, **ภาษีมูลค่าเพิ่ม / VAT 7%**, **จำนวนเงินทั้งสิ้น / Grand Total**

Both samples apply VAT 7%. Neither shows a signature block, bank details, or terms-and-conditions section — so an **unsigned PDF is acceptable**, answering the earlier signature question.

---

## 3. What This Means for the Data Model

### 3.1 Terms belong to the quotation, not the line

In both samples the terms block sits under the only line item — so it looks line-level, but it reads as quotation-level. Currency, Incoterm, payment term, and country of origin describe the whole offer.

**Recommendation:** store these as **quotation header fields** and print them once in a terms block below the table. This is cleaner to enter, cleaner to report on, and avoids repetition when a quotation has several lines.

**This needs confirmation** — see question Q1 below.

### 3.2 Revised line item structure

Based on what the samples actually contain:

| Field | Type | Notes |
|---|---|---|
| Item code | text, optional | Free text in Phase 1 |
| Item name | text | |
| Components | repeating list, optional | qty + code + name each; no prices |
| Image | file, optional | Uploaded per line in Phase 1 |
| Quantity | number | |
| Unit | text | `ea`, `SET`, etc. |
| **Unit cost** | number | **Internal only — never printed** |
| Unit price | number | |
| Discount | number or % | Prints `-` when zero |
| Amount | calculated | |

### 3.3 Revised quotation header fields

| Field | Source | Notes |
|---|---|---|
| Quotation number | auto | Format `QUO#####` |
| Date | user | One enforced format |
| Validity | user | Date or free text |
| Delivery date | user | Date or free text |
| Payment term | user | Free text — samples show `Cash` and `30 days after the date of invoice` |
| Sales person | logged-in user | Name + mobile |
| Currency | account default | |
| Incoterm | picklist | DDP in both samples |
| Country of origin | picklist | Germany in both samples |
| Lead time | **long text** | Must hold a full paragraph — see below |
| VAT applied | toggle, default on | |
| Regulatory note | optional long text | See 3.4 |

### 3.4 Lead time must be rich text, not a number

QUO69054 shows why:

> Cannot be determined until the license is obtained. This product contains restricted chemical which requires import permission from Hazardous Substances Control Bureau, Department of Industrial Works. It will take at least 8 weeks for permission certificate.

Lead time is sometimes a duration, sometimes a conditional explanation. A numeric "weeks" field would not survive contact with reality.

**Related opportunity:** restricted-chemical import permission is a recurring situation for adhesives. Consider a library of **reusable note snippets** the user can insert, so this paragraph is written once rather than retyped. Low build cost, high daily value.

---

## 4. Questions Answered by the Samples

| Prior question | Answer |
|---|---|
| Q8 Language | **Bilingual, single layout.** Fixed labels are Thai + English; entered content is English. |
| Q9 Numbering | Format `QUO#####`, five digits, sequential. |
| Q12 Different templates per type | **No.** One template covers consumable and equipment. |
| Q13 Signature | Not required. Unsigned PDF is acceptable. |

---

## 5. Remaining Questions

**Q1. Are terms per-quotation or per-line?** Both samples have one line, so this is untested. If a quotation contains three products from three origins with different lead times, do terms repeat per line, or is there one set for the document? This decides whether the terms block sits inside the line or below the table.

**Q2. What does the "Min. Order Qty" column actually mean?** The header says minimum order quantity, but the values (`13 ea`, `1 SET`) are used as the quantity that multiplies into Amount. Is this the quantity being quoted, the MOQ, or both because the client must order the MOQ? If they are conceptually different, two columns may be needed.

**Q3. Multi-line layout.** Please share a quotation with three or more line items. Needed to determine row spacing, where the terms block goes, and how page breaks are handled when lines overflow.

**Q4. Is there a page 2?** Neither sample shows bank details or terms and conditions. Confirm whether a second page exists, or whether the quotation is genuinely one page.

**Q5. Numbering scope.** Is `QUO#####` one continuous sequence across all project types and all years, with no reset? Sample numbers 69041 and 69054 suggest a long-running global counter.

**Q6. Revision handling.** Neither sample shows a revision marker. When a price is revised, does the quotation keep its number, take a suffix such as `QUO69054-R2`, or get an entirely new number?

**Q7. A service quotation sample.** Both samples are goods. A service quotation may price man-hours or scope of work, which could stress this layout. Worth checking before concluding one template is enough.

**Q8. Discount format.** Is discount entered as an amount or a percentage? Both samples show `-`, so the populated behaviour is unknown.
