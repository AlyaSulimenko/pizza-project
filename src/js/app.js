"use strict";
import * as flsFunctions from "./modules/functions.js";
flsFunctions.isWebp();
import "./dynamic_adapt.js";
//DOM elements
const sidebarItemsContainer = document.querySelector(".sidebar__items");
const restCard = document.querySelector(".card");
const typeFilters = document.querySelectorAll(".type__link");
const selectOption = document.getElementById("rests-sorting");
const tipsTriggers = document.querySelectorAll(".tooltip-trigger");
const quantuty = document.getElementById("quantity");
//DOM elements in Editing form
const editingArea = document.querySelector(".edit");
const form = document.getElementById("edit-form");
const nameInput = document.getElementById("name-input");
const pictureUrlInput = document.getElementById("pictureUrl-input");
const latInput = document.getElementById("lat-input");
const lngInput = document.getElementById("lng-input");
const addressInput = document.getElementById("address-input");
const phoneInput = document.getElementById("phone-input");
const urlInput = document.getElementById("url-input");
//Radio Inputs
const radios = Array.from(form.querySelectorAll("input[type=radio]"));
const types = Array.from(document.form.type);
//Checkbox Inputs
const checkboxes = Array.from(form.querySelectorAll("input[type=checkbox]"));
const details = Array.from(document.form.details);
//Buttons (static)
const deleteAllBtn = document.querySelector(".button_delete-all");
const saveBtn = document.querySelector(".button_save");
const saveChangesBtn = document.querySelector(".button_save-changes");
//Round buttons
const addBtn = document.querySelector(".round-btn_add");
const backBtn = document.querySelector(".round-btn_back");
//LeafLet elements
const mapArea = document.getElementById("map");

//Starting class
class Rest {
  id = (Date.now() + "").slice(-10);
  constructor(
    name,
    pictureUrl,
    lat,
    lng,
    address,
    phone,
    webUrl,
    type,
    details,
    distance,
    zoomLevel
  ) {
    this.name = name;
    this.pictureUrl = pictureUrl;
    this.lat = lat;
    this.lng = lng;
    this.address = address;
    this.phone = phone;
    this.webUrl = webUrl;
    this.type = type;
    this.details = details;
    this.distance = distance;
    this.zoomLevel = zoomLevel;
  }
}
class App {
  map;
  mapZoomLevel = 13;
  rests = [];
  restsFiltered;
  restsSorted;
  mapEvent; //idk yet?
  isFiltered = false;
  isSorted = false;
  currentPosition = null;
  constructor() {
    //get user's position (load map and show marker on it)
    this.getPosition();
    //Get data from local storage
    this.getLocalStorage();
    //show edit form on clicking + button (for new place)
    addBtn.addEventListener("click", this.showEmptyForm.bind(this));
    //clear & hide form on clicking <- button
    backBtn.addEventListener("click", this.hideEmptyForm.bind(this));
    //add new Restaraunt on submitting form
    saveBtn.addEventListener("click", this.newRest.bind(this));
    //update existing Restaraunt
    saveChangesBtn.addEventListener("click", this.updateRest.bind(this));
    //Open card on clicking on the marker (closing is inside)
    mapArea.addEventListener("click", this.openRestCard.bind(this));
    //On clicking on sidebar item center on matching marker
    sidebarItemsContainer.addEventListener(
      "click",
      this.moveToPopUp.bind(this)
    );
    //Delete all rests
    deleteAllBtn.addEventListener("click", this.deleteAllRests.bind(this));
    //render rests filtered by type
    typeFilters.forEach((filter) => {
      filter.addEventListener(
        "click",
        this.renderFilteredByTypeRests.bind(this)
      );
    });
    //render sidebar small cards sorted
    selectOption.addEventListener("change", this.sortBySelect.bind(this));
    //render tooltips
    tipsTriggers.forEach((target) => {
      target.addEventListener("mouseover", () => {
        target.previousElementSibling.classList.add("show");
      });
    });
    tipsTriggers.forEach((target) => {
      target.addEventListener("mouseleave", () => {
        target.previousElementSibling.classList.remove("show");
      });
    });
  }
  //Methods in alphabetical order:
  deleteAllRests() {
    this.rests = [];
    this.setLocalStorage();
    location.reload();
    //deleteAllBtn.style.display = "none";
  }
  deleteRest(e) {
    e.preventDefault();

    if (
      e.target.classList.contains("erase-icon") ||
      e.target.classList.contains("item-sidebar__delete")
    ) {
      const restBookmark = e.target.closest(".item-sidebar");
      const matchingIndex = this.rests.findIndex(
        (rest) => rest.id === restBookmark.dataset.id
      );
      // Ask the user to confirm the deletion
      const confirmation = confirm(
        "Are you sure you want to delete this item?"
      );

      if (confirmation) {
        this.rests.splice(matchingIndex, 1);
        this.setLocalStorage();
        location.reload();
      }
    }
  }
  findMatchingObject(item) {
    if (!item) {
      return;
    }
    const matchingObject = this.rests.find(
      (rest) => rest.id === item.dataset.id
    );
    return matchingObject;
  }
  findMatchingPopup(sidebarItem) {
    const restsPopups = Array.from(document.querySelectorAll(".rest-popup"));
    if (!sidebarItem) {
      return;
    }
    const matchingPopup = restsPopups.find(
      (popup) => popup.dataset.id === sidebarItem.dataset.id
    );
    restsPopups.forEach((popup) => popup.classList.remove("zoomed-in"));
    return matchingPopup;
  }
  findOutFeatures(e) {
    const checkedFeatures = details.filter((obj) => obj.checked);
    if (checkedFeatures.length === 0 || checkedFeatures.length > 4) {
      document.getElementById("features-error").style.display = "block";
      //e.preventDefault();
    } else {
      document.getElementById("features-error").style.display = "none";
    }
    const checkedIds = checkedFeatures.map((feature) => feature.id);
    console.log(checkedIds);
    return checkedIds;
    // console.log(checkedFeatures);
    // return checkedFeatures;
  }
  findOutType() {
    let type;
    for (let i = 0; i < types.length; i++) {
      if (types[i].checked) {
        type = types[i].value;
      }
    }
    return type;
  }
  getDistance(rest, coords) {
    const [latitude, longitude] = coords; // destructing
    const myLocation = L.latLng(latitude, longitude);
    const restLocation = L.latLng(rest.lat, rest.lng);
    const distance = myLocation.distanceTo(restLocation);
    const distanceInKm = (distance / 1000).toFixed(2);
    console.log(`From me to ${rest.name} ${distanceInKm}`);
    return distanceInKm;
  }
  getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("restaraunts"));
    if (!data) return;
    this.rests = data;
  }
  getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.loadMap(position); // Pass the position object to loadMap()
        },

        () => {
          alert("Your position is unavailable");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  }
  hideEmptyForm() {
    nameInput.value =
      pictureUrlInput.value =
      latInput.value =
      lngInput.value =
      addressInput.value =
      phoneInput.value =
      urlInput.value =
        "";
    checkboxes.forEach((checkbox) => (checkbox.checked = false));
    radios.forEach((radio) => (radio.checked = false));
    document.querySelector(".edit").classList.remove("show");
  }
  loadMap(position) {
    // for actual location:
    // const { latitude, longitude } = position.coords;
    // const coords = [latitude, longitude];
    const coords = [50.009916823036455, 36.217710562611956]; //my address dummy version
    this.map = L.map(mapArea).setView(coords, this.mapZoomLevel);

    L.tileLayer(
      "https://tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey=7d1fdef00f54433b927c5529f4459dde",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ).addTo(this.map);

    const bounds = L.latLngBounds();
    //adding marker of user's location
    L.marker(coords)
      .addTo(this.map)
      .bindPopup(
        L.popup({
          maxWidth: 50,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: "location-popup",
        })
      )
      .setPopupContent(
        `<div class="location-popup"><img src="../img/hungry.svg" alt="hungry" /></div>`
      )
      .openPopup();

    bounds.extend(coords);
    //
    this.rests.forEach((rest) => {
      const restCoords = [rest.lat, rest.lng];

      L.marker(restCoords)
        .addTo(this.map)
        .bindPopup(
          L.popup({
            maxWidth: 50,
            minWidth: 50,
            autoClose: false,
            closeOnClick: false,
            className: rest.type,
          })
        )
        .setPopupContent(
          `<div class="rest-popup with-id ${rest.type}" data-id='${rest.id}'><img src="../img/pizza-love.svg" alt="pizza" /></div>`
        )
        .openPopup();

      bounds.extend(restCoords);
      rest.distance = this.getDistance(rest, coords); // Call getDistance() here
      //this.renderRestMarker(rest); // I removed it here from getLocalStorage(), cause it must be executed on loading map is loaded
      this.renderToSidebar(rest); //same here
    });

    this.map.fitBounds(bounds);
    quantuty.innerHTML = this.rests.length;
  }
  moveToPopUp(e) {
    const sidebarItemElement = e.target.closest(".item-sidebar");
    const matchingObject = this.findMatchingObject(sidebarItemElement);
    this.map.setView(
      [matchingObject.lat, matchingObject.lng],
      this.mapZoomLevel,
      {
        animate: true,
        pan: { duration: 1.5 },
      }
    );
    const matchingPopup = this.findMatchingPopup(sidebarItemElement);
    matchingPopup.classList.add("in-focus");
  }
  newRest(e) {
    // e.preventDefault();
    if (form.checkValidity()) {
      const name = nameInput.value;
      const pictureUrl = pictureUrlInput.value;
      const restLat = latInput.value;
      const restLng = lngInput.value;
      const address = addressInput.value;
      const phone = phoneInput.value;
      const webUrl = urlInput.value;
      const typeChosen = this.findOutType();
      const featuresChosen = this.findOutFeatures();
      console.log(featuresChosen);
      const rest = new Rest(
        name,
        pictureUrl,
        restLat,
        restLng,
        address,
        phone,
        webUrl,
        typeChosen,
        featuresChosen
      );
      //add rest to array of rests
      this.rests.push(rest);
      //render rest on list in sidebar
      this.renderToSidebar(rest);
      //render on map
      this.renderRestMarker(rest);
      //Saving to local storage
      this.setLocalStorage();
      location.reload();
    } else {
      alert("Please fill out all required fields.");
    }
  }
  openRestCard(e) {
    //opening
    if (editingArea.classList.contains("show")) {
      editingArea.classList.remove("show");
    }
    const targetClicked = e.target.closest(".with-id");
    if (!targetClicked.classList.contains("zoomed-in")) {
      targetClicked.classList.remove("in-focus");
      if (targetClicked.classList.contains("location-popup")) {
        targetClicked.classList.toggle("show");
      } else if (
        targetClicked.classList.contains("fancy") ||
        targetClicked.classList.contains("casual") ||
        targetClicked.classList.contains("takeaway") ||
        targetClicked.classList.contains("item-sidebar")
      ) {
        restCard.classList.add("show");
      }
      //finding mathing data in array
      const matchingObject = this.findMatchingObject(targetClicked);
      //zooming msp on matching marker
      this.map.setView(
        [matchingObject.lat, matchingObject.lng],
        this.mapZoomLevel,
        {
          animate: true,
          pan: { duration: 1.5 },
        }
      );
      //rendering mathing data
      document
        .querySelectorAll(".rest-popup")
        .forEach((popup) => popup.classList.remove("zoomed-in"));
      targetClicked.classList.add("zoomed-in");
      const cardHtml = `<div class="card__header sidebar__header">
      <p class="tooltip-text">Link to code</p>
    <a  href="https://github.com/AlyaSulimenko/pizza-project"
        target="_blank" 
        class="card__logo logo tooltip-trigger">
      <div class="logo__image">
        <img src="../img/logo.png" alt="logo" />
      </div>
      <h1 class="logo__title title">Pizza Hunt</h1>
    </a>
  </div>
  <div class="card__body">
    <h2 class="card__title title" id="card-title">
      ${matchingObject.name}
    </h2>
    <div class="card__columns">
      <div class="card__column_tab">
        <div class="card__image" id="card-img-url">
          <img
            src="${matchingObject.pictureUrl}"
            alt="restaurant"
          />
        </div>
      </div>
      <div class="card__column_tab card__column_tab-with-footer">
        <ul class="card__contacts">
          <li class="card__address">
            <span class="material-symbols-outlined">
              location_on </span
            ><span>${matchingObject.address}</span>
          </li>
          <li class="card__phone">
            <a href="tel:${matchingObject.phone}"
              ><span class="material-symbols-outlined"> call </span
              ><span>${matchingObject.phone}</span></a
            >
          </li>
          <li class="card__web">
            <a href="${matchingObject.webUrl}" target="_blank"
              ><span class="material-symbols-outlined">
                language </span
              ><span>Check the web-site!</span></a
            >
          </li>
        </ul>
        <ul class="card__tags">
        </ul>
      </div>
      <div class="card__column_tab"></div>
    </div>
  </div>
  <div
    class="card__footer sidebar__footer"
    data-da=".card__column_tab-with-footer, 991.98"
  >
    <button class="button button_edit-info">Edit Info</button
    >
    <button class="round-btn round-btn_back card-btn_back">
      <span></span><span></span><span></span>
    </button>
  </div>`;
      restCard.innerHTML = cardHtml;
      restCard.setAttribute("data-id", `${matchingObject.id}`);
      restCard.classList.add("with-id");
      //rendering 'details' icons
      if (matchingObject.details) {
        matchingObject.details.forEach((string) => {
          let matchingCheckbox = checkboxes.find((checkbox) => {
            return checkbox.id === string;
          });
          if (matchingCheckbox) {
            const match = matchingCheckbox.value;
            console.log(match);
            const detailsItem = document.createElement("li");
            detailsItem.classList.add("card__tag");
            const html = `<p class="tooltip-text">${match}</p>
            <a href="" class="card__link tooltip-trigger ${string}">
              <img src="../img/details(naming!)/${string}.svg" alt="${string}"/>
            </a>`;
            detailsItem.innerHTML = html;
            document.querySelector(".card__tags").appendChild(detailsItem);
          }
        });
      }
      //tool-tips on 'detailes'!!!TREMBLING
      const targets = restCard.querySelectorAll(".tooltip-trigger");
      targets.forEach((target) => {
        target.addEventListener("mouseover", () => {
          target.previousElementSibling.classList.add("show");
        });
      });
      targets.forEach((target) => {
        target.addEventListener("mouseleave", () => {
          target.previousElementSibling.classList.remove("show");
        });
      });
    } else if (targetClicked.classList.contains("zoomed-in")) {
      targetClicked.classList.remove("zoomed-in");
      restCard.classList.remove("show");
    }
    //hiding card on clicking <-
    restCard.querySelector(".card-btn_back").addEventListener("click", () => {
      targetClicked.classList.remove("zoomed-in");
      restCard.classList.remove("show");
    });
    //Opening editor from big card
    const editInfoBtn = restCard.querySelector(".button_edit-info");
    editInfoBtn.addEventListener("click", this.showEditingForm.bind(this));
  }
  renderFilteredByTypeRests(e) {
    e.preventDefault();
    const typeLink = e.target.parentNode;
    const data = JSON.parse(localStorage.getItem("restaraunts"));
    const restsPopups = Array.from(document.querySelectorAll(".rest-popup"));
    const restsMarkers = restsPopups.map((popup) => {
      const marker = popup.closest(".leaflet-popup");
      marker.classList.add(`${popup.classList.item(2)}`);
      return marker ? marker : null;
    });
    if (!typeLink.classList.contains("active")) {
      this.isFiltered = true;
      //styling links
      typeFilters.forEach((link) => link.classList.remove("active"));
      typeFilters.forEach((link) => link.classList.add("inactive"));
      typeLink.classList.remove("inactive");
      typeLink.classList.add("active");
      //creating and rendering restsFiltered
      if (!data) return;
      this.restsFiltered = [...data];
      this.restsFiltered = this.restsFiltered.filter((rest) => {
        return typeLink.classList.contains(`${rest.type}`);
      });
      localStorage.setItem(
        "filtered restaraunts",
        JSON.stringify(this.restsFiltered)
      );
      const dataFiltered = JSON.parse(
        localStorage.getItem("filtered restaraunts")
      );
      if (!dataFiltered) return;
      this.restsFiltered = dataFiltered;
      sidebarItemsContainer.innerHTML = "";
      this.restsFiltered.forEach((rest) => {
        this.renderToSidebar(rest);
      });
      //markers(css only)
      restsMarkers.forEach((marker) => (marker.style.display = "none"));
      const markersOfType = restsMarkers.filter((marker) => {
        return typeLink.classList.contains(marker.classList.item(1));
      });
      markersOfType.forEach((marker) => (marker.style.display = "block"));
    } else if (typeLink.classList.contains("active")) {
      this.isFiltered = false;
      //styling links
      typeFilters.forEach((link) => link.classList.remove("inactive"));
      typeFilters.forEach((link) => link.classList.remove("active"));
      //Rendering rests
      sidebarItemsContainer.innerHTML = "";
      this.getLocalStorage();
      //markers(css only)
      restsMarkers.forEach((marker) => (marker.style.display = "block"));
    }
    this.sortBySelect();
    quantuty.innerHTML = this.isFiltered
      ? this.restsFiltered.length
      : this.rests.length;
  }
  renderRestMarker(rest) {
    L.marker([+rest.lat, +rest.lng])
      .addTo(this.map)
      .bindPopup(
        L.popup({
          maxWidth: 50,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${rest.type}`,
        })
      )
      .setPopupContent(
        `<div class="rest-popup  with-id ${rest.type}" data-id='${rest.id}'><img src="../img/pizza-love.svg" alt="pizza"
      /></div>`
      )
      .openPopup();
  }
  renderToSidebar(rest) {
    let sidebarItem = document.createElement("li");
    sidebarItem.setAttribute("data-id", `${rest.id}`);
    sidebarItem.classList.add("item-sidebar");
    sidebarItem.classList.add("with-id");
    sidebarItem.classList.add(`item-sidebar_${rest.type}`);
    sidebarItem.innerHTML = `<div class="item-sidebar__header">
    <div class="item-sidebar__title">${rest.name}</div>
    <div class="item-sidebar__actions">
      <a href="#" class="item-sidebar__more">
        <span class="material-symbols-outlined more-icon">more</span>
      </a>
      <a href="#" class="item-sidebar__edit">
        <span class="material-symbols-outlined edit-icon">edit</span>
      </a>
      <a href="#" class="item-sidebar__delete">
        <span class="material-symbols-outlined erase-icon">close</span>
      </a>
    </div>
  </div>
  <div class="item-sidebar__footer">
    <div class="item-sidebar__distance">${rest.distance} km away</div>
  </div>`;

    sidebarItemsContainer.appendChild(sidebarItem);
    this.hideEmptyForm();
    //to open rest card from the sidebar small card
    const moreIcon = sidebarItem.querySelector(".more-icon");
    moreIcon.addEventListener("click", (e) => this.openRestCard(e));
    //to edit rest from the sidebar small card
    const editIcon = sidebarItem.querySelector(".edit-icon");
    editIcon.addEventListener("click", (e) => this.showEditingForm(e));
    //to delete rest from the sidebar small card
    const eraseIcon = sidebarItem.querySelector(".erase-icon");
    eraseIcon.addEventListener("click", (e) => this.deleteRest(e));
    this.setLocalStorage();
  }
  setLocalStorage() {
    localStorage.setItem("restaraunts", JSON.stringify(this.rests));
  }
  showEditingForm(e) {
    editingArea.classList.add("show");
    saveChangesBtn.style.display = "inline-block";
    saveBtn.style.display = "none";
    const restToEdit = e.target.closest(".with-id");
    restToEdit.classList.add("under-edition");
    const matchingObject = this.findMatchingObject(restToEdit);
    nameInput.value = matchingObject.name;
    pictureUrlInput.value = matchingObject.pictureUrl;
    latInput.value = matchingObject.lat;
    lngInput.value = matchingObject.lng;
    addressInput.value = matchingObject.address;
    phoneInput.value = matchingObject.phone;
    urlInput.value = matchingObject.webUrl;
    radios.forEach((radio) => {
      if (radio.value === matchingObject.type) {
        radio.checked = true;
      }
    });
    checkboxes.forEach((checkbox) => {
      if (matchingObject.details.includes(checkbox.value)) {
        checkbox.checked = true;
      }
    });
  }
  showEmptyForm() {
    editingArea.classList.add("show");
    saveChangesBtn.style.display = "none";
    saveBtn.style.display = "inline-block";
  }
  sortBySelect() {
    const sortBy = selectOption.value;
    let arrayToSort;
    let storageName;
    if (this.isFiltered) {
      arrayToSort = this.restsFiltered;
      storageName = "filtered restaraunts";
    } else if (!this.isFiltered) {
      arrayToSort = this.rests;
      storageName = "restaraunts";
    }
    switch (sortBy) {
      case "a-z":
        this.restsSorted = arrayToSort.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        break;
      case "z-a":
        this.restsSorted = arrayToSort
          .sort((a, b) => a.name.localeCompare(b.name))
          .reverse();
        break;
      case "nearest":
        this.restsSorted = arrayToSort.sort((a, b) => {
          // const distanceA = this.getDistance(a);
          // const distanceB = this.getDistance(b);
          const distanceA = a.distance;
          const distanceB = b.distance;

          console.log(distanceA, distanceB);
          return distanceA - distanceB;
        });
        break;
      case "furthest":
        this.restsSorted = arrayToSort.sort((a, b) => {
          // const distanceA = this.getDistance(a);
          // const distanceB = this.getDistance(b);
          const distanceA = a.distance;
          const distanceB = b.distance;
          return distanceB - distanceA;
        });
        break;
      default:
        this.restsSorted = this.rests;
    }
    localStorage.setItem(storageName, JSON.stringify(arrayToSort));
    sidebarItemsContainer.innerHTML = "";
    const data = JSON.parse(localStorage.getItem(storageName));
    if (!data) return;
    arrayToSort = data;
    arrayToSort.forEach((rest) => {
      this.renderToSidebar(rest);
    });
  }
  updateRest() {
    if (form.checkValidity()) {
      const restToUpdate = document.querySelector(".under-edition");
      const matchingObject = this.findMatchingObject(restToUpdate);
      matchingObject.name = nameInput.value;
      matchingObject.pictureUrl = pictureUrlInput.value;
      matchingObject.lat = latInput.value;
      matchingObject.lng = lngInput.value;
      matchingObject.address = addressInput.value;
      matchingObject.phone = phoneInput.value;
      matchingObject.webUrl = urlInput.value;
      matchingObject.type = this.findOutType();
      matchingObject.details = this.findOutFeatures();
      restToUpdate.classList.remove("under-edition");
      this.setLocalStorage();
      location.reload();
    } else {
      alert("Please fill out all required fields.");
    }
  }
}
new App();
