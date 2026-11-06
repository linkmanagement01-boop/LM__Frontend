LM Traffic Helper – install (one time, Google Chrome)
=====================================================

1. Unzip lm-traffic-helper.zip into a folder you will keep (e.g. Documents\lm-traffic-helper).
   Don't delete the folder later – Chrome loads the helper from it.
2. Open chrome://extensions
3. Turn ON "Developer mode" (top right).
4. Click "Load unpacked" and choose the unzipped lm-traffic-helper folder.
5. Reload the Link Management tab.

Use
---
View All Sites → "Check traffic" on a domain.
The check runs in a small separate Ahrefs window – you stay on View All Sites and the row updates when it is saved.
Tip: keep that window visible next to Link Management (don't cover or minimise it) – Ahrefs' security check
then passes by itself. Only if Ahrefs really asks you to verify you are human, the window comes to the front:
complete it and the check continues by itself. The window closes when it is done.

If a check isn't saved automatically, click "Save now" in the dark box at the bottom right of the Ahrefs window.

Traffic Lookup (admin)
----------------------
Sites → Traffic Lookup: paste a list of domains (they don't need to be in Link Management) and click Start.
The helper checks them one after another in the separate Ahrefs window and fills in each domain's top country
and organic traffic on the page – nothing is saved to your sites. Download the results as Excel when done.
Needs helper 1.3.0 or newer.

Choosing what to check (Traffic Lookup)
---------------------------------------
Country, Traffic, DR and RD are all ticked by default – untick what you don't need before Start.
Country & Traffic come from the Traffic Checker; DR and RD (= Backlinks) from the Website Authority Checker.
A page is only opened when one of its fields is ticked, so unticking a pair makes the run faster.
If DR & RD don't load, the domain keeps its other results and shows "DR & RD not loaded".
Needs helper 1.5.0 or newer; checking only DR / RD needs 1.6.0.
