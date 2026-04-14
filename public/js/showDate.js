const start = document.querySelector('input[name="startDate"]');
const end = document.querySelector('input[name="endDate"]');

start.addEventListener("change", () => {
if (!start.value) return;

const startDate = new Date(start.value);
startDate.setDate(startDate.getDate() + 1);

const minEnd =
    startDate.toISOString().split("T")[0];

  end.min = minEnd;
if (!end.value || end.value < minEnd) {
      end.value = "";
    }
  });

