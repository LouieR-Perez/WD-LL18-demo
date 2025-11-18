// --- DOM elements ---
const randomBtn = document.getElementById("random-btn");
const recipeDisplay = document.getElementById("recipe-display");
const remixBtn = document.getElementById("remix-btn");
const remixTheme = document.getElementById("remix-theme");
const remixOutput = document.getElementById("remix-output");
const savedRecipesContainer = document.getElementById("saved-recipes-container");
const savedRecipesList = document.getElementById("saved-recipes-list");

// Store the current recipe data so we can use it for remixing
let currentRecipe = null;

// This function creates a list of ingredients for the recipe from the API data
// It loops through the ingredients and measures, up to 20, and returns an HTML string
// that can be used to display them in a list format
// If an ingredient is empty or just whitespace, it skips that item 
function getIngredientsHtml(recipe) {
  let html = "";
  for (let i = 1; i <= 20; i++) {
    const ing = recipe[`strIngredient${i}`];
    const meas = recipe[`strMeasure${i}`];
    if (ing && ing.trim()) html += `<li>${meas ? `${meas} ` : ""}${ing}</li>`;
  }
  return html;
}

// This function displays the recipe on the page
function renderRecipe(recipe) {
  // Store the current recipe for remixing
  currentRecipe = recipe;
  
  recipeDisplay.innerHTML = `
    <div class="recipe-title-row">
      <h2>${recipe.strMeal}</h2>
    </div>
    <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
    <h3>Ingredients:</h3>
    <ul>${getIngredientsHtml(recipe)}</ul>
    <h3>Instructions:</h3>
    <p>${recipe.strInstructions.replace(/\r?\n/g, "<br>")}</p>
    <button id="save-recipe-btn" class="accent-btn save-inline-btn">Save Recipe</button>
  `;

  // After rendering, hook up the Save button
  const saveBtn = document.getElementById("save-recipe-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveCurrentRecipeName);
  }
}

// This function gets a random recipe from the API and shows it
async function fetchAndDisplayRandomRecipe() {
  recipeDisplay.innerHTML = "<p>Loading...</p>"; // Show loading message
  try {
    // Fetch a random recipe from the MealDB API
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php'); 
    const data = await res.json(); // Parse the JSON response
    const recipe = data.meals[0]; // Get the first recipe from the response
    renderRecipe(recipe); // Display the recipe on the page

  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load a recipe.</p>";
  }
}

// This function sends the current recipe and remix theme to OpenAI
// and displays the AI's creative remix on the page
async function remixRecipe() {
  // Check if we have a recipe to remix
  if (!currentRecipe) {
    remixOutput.textContent = "Please load a recipe first!";
    return;
  }

  // Get the selected remix theme from the dropdown
  const theme = remixTheme.value;

  // Show a loading message while we wait for the AI
  remixOutput.textContent = "Loading...";

  try {
    // Send a request to OpenAI's chat completions API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `Here is a recipe: ${JSON.stringify(currentRecipe)}. ${theme}. Give me a short, fun, creative, and totally doable remix of this recipe. Highlight any changed ingredients or cooking instructions. Keep it brief and exciting!`
          }
        ]
      })
    });

    // Parse the response from OpenAI
    const data = await response.json();
    
    // Get the AI's message and display it on the page
    const remixedRecipe = data.choices[0].message.content;
    remixOutput.textContent = remixedRecipe;

  } catch (error) {
    remixOutput.textContent = "Sorry, couldn't remix the recipe.";
  }
}

// ---------------- Saved Recipes (localStorage) ----------------
// Load saved recipe names from localStorage
function getSavedRecipes() {
  try {
    const raw = localStorage.getItem("savedRecipes");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

// Save array back to localStorage
function setSavedRecipes(arr) {
  try {
    localStorage.setItem("savedRecipes", JSON.stringify(arr));
  } catch (e) {
    // silently ignore storage errors
  }
}

// Display saved recipes list in the UI
function displaySavedRecipes() {
  const recipes = getSavedRecipes();
  // Show or hide the container
  if (recipes.length === 0) {
    savedRecipesContainer.style.display = "none";
    savedRecipesList.innerHTML = "";
    return;
  }
  savedRecipesContainer.style.display = "block";
  savedRecipesList.innerHTML = recipes.map(name => `
    <li class="saved-recipe-item">
      <span class="saved-recipe-name">${name}</span>
      <button class="delete-btn" data-name="${name}">Delete</button>
    </li>
  `).join("");
}

// Add current recipe name to saved list
function saveCurrentRecipeName() {
  if (!currentRecipe) return;
  const name = currentRecipe.strMeal;
  let recipes = getSavedRecipes();
  if (!recipes.includes(name)) {
    recipes.push(name);
    setSavedRecipes(recipes);
    displaySavedRecipes();
  }
}

// Load saved recipes on startup
function loadSavedRecipes() {
  displaySavedRecipes();
}

// Fetch full recipe details by name from MealDB and render it
async function fetchRecipeByName(name) {
  if (!name) return;
  recipeDisplay.innerHTML = "<p>Loading saved recipe...</p>";
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`);
    const data = await res.json();
    if (data.meals && data.meals.length > 0) {
      renderRecipe(data.meals[0]);
    } else {
      recipeDisplay.innerHTML = "<p>Sorry, couldn't find that recipe.</p>";
    }
  } catch (e) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load that saved recipe.</p>";
  }
}


// --- Event listeners ---

// When the button is clicked, get and show a new random recipe
randomBtn.addEventListener("click", fetchAndDisplayRandomRecipe);

// When the Remix button is clicked, remix the current recipe
remixBtn.addEventListener("click", remixRecipe);

// When the page loads, show a random recipe right away
window.addEventListener("load", () => {
  loadSavedRecipes();
  fetchAndDisplayRandomRecipe();
});
// document.addEventListener("DOMContentLoaded", fetchAndDisplayRandomRecipe); used in class

// Click delegation for saved recipe names
savedRecipesList.addEventListener("click", (e) => {
  const target = e.target;
  if (target.classList && target.classList.contains("saved-recipe-name")) {
    const name = target.textContent.trim();
    if (name) fetchRecipeByName(name);
  } else if (target.classList && target.classList.contains("delete-btn")) {
    const name = target.getAttribute("data-name");
    if (name) {
      let recipes = getSavedRecipes().filter(r => r !== name);
      setSavedRecipes(recipes);
      displaySavedRecipes();
    }
  }
});