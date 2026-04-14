  const listingFilter = document.getElementById("filterListing");
  const monthFilter = document.getElementById("filterMonth");

  function filterTable(tableId) {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll("tbody tr");

    const listingVal = listingFilter.value;
    const monthVal = monthFilter.value;

    rows.forEach(row => {
      const rowListing = row.dataset.listing;
      const rowMonth = row.dataset.month;

      if ((listingVal === "" || rowListing === listingVal) &&
          (monthVal === "" || rowMonth === monthVal)) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  }



  listingFilter.addEventListener("change", () => {
    filterTable("pendingTable");
    filterTable("confirmedTable");
  });

  monthFilter.addEventListener("change", () => {
    filterTable("pendingTable");
    filterTable("confirmedTable");
  });
