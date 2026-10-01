# Family profiles and physical bundles

Use **Family members** in the navigation to add or edit a person's emergency details, contacts and scan privacy. Each member has a distinct QR token. Archiving a member disables their public tag and removes them from future selections; existing order records remain.

Physical packages require exactly 1, 3, 5 or 10 distinct selected people. **Include my own tag** uses one slot. Saved but unselected members do not count. Bundle quantity is the number of copies for every selected person. Each copy is a keychain plus wallet card. The maximum remains 20 sets per order. Prices remain PHP 100 / 210 / 350 / 700 per package.

The server accepts `memberIds` (JSON array in multipart requests), `includeSelf` (`true` or `false`) and `bundleQuantity`. It calculates total sets and price independently. The existing `quantity` database column remains total sets for compatibility; new `bundle_quantity`, `package_size` and `total_peso` columns preserve explicit package details. Each `tag_order_recipients` row captures a person's name, QR token and copy count in the order transaction.

Startup migrations add `family_members`, `tag_order_recipients` and the three nullable order columns. Historical orders keep their original owner-only printing behavior and are not assigned invented recipients. Check the migration summary before making the feature available. No existing profile or QR records are converted.

Editing medical details updates the scanned profile. Archived members or regenerated/inactive owner QR tokens block printing of orders that reference those tags, rather than silently replacing the ordered token. Physical confirmation emails show the recipient breakdown; digital email orders retain the previous behavior.

Validation: `node --test server/test/family.test.js`; frontend build: `npm --prefix client run build`.

The automated tests use a mocked database and do not send email. Before deployment, validate migrations against a staging MySQL database and run an authenticated end-to-end order/print check with three members and bundle quantity two. Confirm six keychains and six cards, each member appearing twice and scanning to the correct profile. Check both GCash and COD, owner inclusion, historical orders and digital delivery.
