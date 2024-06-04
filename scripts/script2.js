//--------------------------------------------------Pricing Table javascript---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function() {
        // Function to switch to monthly pricing
        function switchToMonthly() {
            document.getElementById("monthly").classList.add("active");
            document.getElementById("yearly").classList.remove("active");
            document.querySelector(".monthlyPriceList").classList.remove("d-none");
            document.querySelector(".monthlyPriceList").classList.add("fadeIn");
            document.querySelector(".yearlyPriceList").classList.add("d-none");
            document.querySelector(".indicator").style.left = "2px";
        }
    
        // Function to switch to yearly pricing
        function switchToYearly() {
            document.getElementById("yearly").classList.add("active");
            document.getElementById("monthly").classList.remove("active");
            document.querySelector(".yearlyPriceList").classList.remove("d-none");
            document.querySelector(".yearlyPriceList").classList.add("fadeIn");
            document.querySelector(".monthlyPriceList").classList.add("d-none");
            document.querySelector(".indicator").style.left = "163px";
        }
    
        // Event listeners for monthly and yearly buttons
        document.getElementById("monthly").addEventListener("click", switchToMonthly);
        document.getElementById("yearly").addEventListener("click", switchToYearly);
});