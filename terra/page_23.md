---
updatedAt: 2026-09-18T19:56:36.000Z
agentTools:
  projectIndex: https://docs.terra.tripadvisor.com/llms.txt
---

# How to use Enumerations

## Overview

The enumerations file contains translated enum values used across Terra and represents all translated enumeration language terms on Tripadvisor for data types such as location categories, amenities, cuisines, and more.

## Accessing the enumerations file

Enumerations ship as a daily feed file, available to all partners. The filename tells you which API version it matches:

| API version         | Filename             |
| ------------------- | -------------------- |
| v1                  | `enum_V1.json.gz`    |
| v2 (`version=beta`) | `enum_Vbeta.json.gz` |

Download it the same way as any other feed — see the [Guide for Downloading Feeds](/docs/download-a-feed). The file is gzipped JSON.

## What a record looks like

Each record pairs an enum type with its values, and each value carries its translations keyed by language code:

```json
{
  "enum_type": "category",
  "values": [
    {
      "id": "10591",
      "translations": {
        "en": "Restaurants",
        "es": "Restaurantes",
        "fr": "Restaurants",
        "ja": "レストラン"
      }
    }
  ]
}
```

| Field                   | Notes                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `enum_type`             | The enum type, matching the sections below (`category`, `amenities`, `rating` and so on). |
| `values[].id`           | The stable identifier. This is what appears in API responses; join on it.                 |
| `values[].translations` | A map of language code to translated label.                                               |

**In v2**, values that contain placeholders also carry a `parameters` field describing what each `{0}` slot expects. See the `award_names` and `other` types below for examples of placeholder values.

Cache this file and join on `values[].id`. Always fall back to the ID if a translation is missing for the language you want.

## Enum Types

### 1. `category`

**Description:** Location and attraction categories

**Use Case:** Categorize locations, restaurants, hotels, and attractions (e.g., "Romana", "Lazio", "Submarine Tours", "Surfing, Windsurfing & Kitesurfing", "Nature & Wildlife Tours")

**Sample Values:**

* Romana (Italian regional cuisine)
* Lazio (Italian regional cuisine)
* Submarine Tours
* Surfing, Windsurfing & Kitesurfing
* Nature & Wildlife Tours

***

### 2. `amenities`

**Description:** Property amenities and facilities

**Use Case:** Display available amenities at hotels, restaurants, and other properties (e.g., "Telephone", "Taxi service", "Fitness Center", "Swimming pool", "Hot tub", "Golf course")

**Sample Values:**

* Telephone
* Taxi service
* Fitness Center with Gym / Workout Room
* Clothes rack
* Swimming pool toys
* Laundry service
* Hot tub
* Golf course

***

### 3. `restaurant_dining_options`

**Description:** Restaurant dining features and options

**Use Case:** Display restaurant features and dining options (e.g., "Playgrounds", "BYOB", "Beach", "Drive Thru", "Waterfront", "Accepts Credit Cards", "Dog Friendly", "Buffet")

**Sample Values:**

* Playgrounds
* BYOB
* Beach
* Drive Thru
* Jazz Bar
* Waterfront
* Accepts Credit Cards
* Dog Friendly
* Street Parking
* Buffet

***

### 4. `rules-based`

**Description:** Hotel styles and property characteristics

**Use Case:** Categorize hotels and properties by style or characteristic (e.g., "Business", "Glamping", "Budget", "Marina View", "Mountain View", "Romantic", "Trendy", "City View", "Hidden Gems")

**Sample Values:**

* Business
* Glamping
* Budget
* Marina View
* Mountain View
* Romantic
* Trendy
* City View
* Harbor View
* Hidden Gems

***

### 5. `rating`

**Description:** Overall rating scale

**Use Case:** Display rating labels for reviews and ratings (e.g., "Terrible", "Poor", "Average", "Very Good", "Excellent")

**Sample Values:**

* Terrible
* Poor
* Average
* Very Good
* Excellent

***

### 6. `sub_ratings`

**Description:** Detailed rating categories

**Use Case:** Display sub-rating categories for detailed reviews (e.g., "Food", "Sleep Quality", "Atmosphere", "Service", "Cleanliness", "Location", "Rooms", "Value")

**Sample Values:**

* Food
* Sleep Quality
* Atmosphere
* Service
* Cleanliness
* Location
* Rooms
* Value

***

### 7. `restaurant_styles`

**Description:** Restaurant style and atmosphere categories

**Use Case:** Categorize restaurants by style, atmosphere, or target audience (e.g., "Hidden Gems", "Local cuisine", "Hot New Restaurants", "Families with children", "Romantic", "Business meetings", "Bar scene", "Special occasions", "Large groups", "Kids")

**Sample Values:**

* Hidden Gems
* Local cuisine
* Hot New Restaurants
* Families with children
* Romantic
* Business meetings
* Bar scene
* Special occasions
* Large groups
* Kids

***

### 8. `dining_restrictions`

**Description:** Dietary restrictions and special diets

**Use Case:** Display dietary options and restrictions (e.g., "Kosher", "Gluten free options", "Vegan options", "Halal", "Vegetarian friendly")

**Sample Values:**

* Kosher
* Gluten free options
* Vegan options
* Halal
* Vegetarian friendly

***

### 9. `priority_1_attributes`

**Description:** "Good for" attributes for attractions and activities

**Use Case:** Display suitability attributes for attractions and activities (e.g., "Good for Kids", "Good for Big Groups", "Buy a Ticket in Advance", "Budget-friendly", "Good for a Rainy Day", "Hidden Gems", "Top Picnic Spots", "Good for Couples", "Good for Adrenaline Seekers")

**Sample Values:**

* Good for Kids
* Good for Big Groups
* Buy a Ticket in Advance
* Budget-friendly
* Good for a Rainy Day
* Hidden Gems
* Top Picnic Spots
* Good for Couples
* Good for Adrenaline Seekers

***

### 10. `award_names`

**Description:** Award names and titles

**Use Case:** Display award names (e.g., "Travelers' Choice Awards Best of the Best {0}", "Travelers' Choice Awards {0}")

**Sample Values:**

* Travelers' Choice Awards Best of the Best {0}
* Travelers' Choice Awards {0}

**Note:** These values include placeholders ({0}) for dynamic content insertion.

***

### 11. `restaurant_meal_types`

**Description:** Meal service times

**Use Case:** Display meal service availability (e.g., "Brunch", "Late Night", "Drinks", "Lunch", "Breakfast", "Dinner")

**Sample Values:**

* Brunch
* Late Night
* Drinks
* Lunch
* Breakfast
* Dinner

***

### 12. `attribute_type`

**Description:** Attribute category labels

**Use Case:** Display section headers for different attribute types (e.g., "Amenities", "Meals", "Good for", "Hotel Style", "Special Diets", "FEATURES")

**Sample Values:**

* Amenities
* Meals
* Good for
* Hotel Style
* Special Diets
* FEATURES
* Good for (restaurant context)

***

### 13. `other`

**Description:** Miscellaneous template strings

**Use Case:** Template strings for dynamic content (e.g., "#{0} of {1} {2} in {3}")

**Sample Values:**

* {0} of {1} {2} in {3} (for restaurant categories display)

**Note:** This value includes placeholders for dynamic content insertion.

***

## Language Support

All enum values are translated into **50+ languages**, including:

* **European Languages:** English (en, en\_US, en\_UK, en\_AU, en\_CA, en\_IE, en\_IN, en\_MY, en\_NZ, en\_PH, en\_SG, en\_ZA), Spanish (es, es\_AR, es\_CL, es\_CO, es\_MX, es\_PE, es\_VE), French (fr, fr\_CA), German (de, de\_AT, de\_CH), Italian (it, it\_CH), Portuguese (pt, pt\_PT), Dutch (nl), Russian (ru), Polish (pl), Czech (cs), Hungarian (hu), Greek (el), Turkish (tr), Swedish (sv), Norwegian (no), Danish (da), Finnish (fi), and more

* **Asian Languages:** Chinese (zh, zh\_TW, zh\_HK), Japanese (ja), Korean (ko), Thai (th), Vietnamese (vi), Indonesian (in)

* **Middle Eastern Languages:** Arabic (ar, ar\_EG), Hebrew (iw)

* **Other Languages:** Ukrainian (uk), Serbian (sr), Slovak (sk)

<Callout icon="🚧" theme="warn">
  ### **Three code systems, three spellings**

  Terra uses different language-code formats in different places. Check which one applies before you join data across them:

  | Where                               | Format                                   | Examples                           |
  | ----------------------------------- | ---------------------------------------- | ---------------------------------- |
  | Enumerations feed (this page)       | Underscored, language or language_REGION | `en`, `en_US`, `zh_TW`, `iw`, `in` |
  | `locale` parameter, factual content | Dashed, full locale required             | `en-US`, `zh-TW`, `he-IL`, `id-ID` |
  | `language` parameter, reviews       | Dashed, canonical language only          | `en`, `zh-CN`, `iw`, `id`          |

  Hebrew is `iw` in the enumerations feed and on reviews, but `he-IL` as a locale. Indonesian is `in` here, `id` on reviews, and `id-ID` as a locale. Simplified Chinese is `zh` as a locale but `zh-CN` on reviews.

  See [Supported Locales for Factual Content](/docs/locales) and [Supported Languages for Reviews](/docs/supported-languages-for-reviews).
</Callout>

***

## Usage Recommendations

1. **Cache the enum file locally** - Update daily or weekly since enum values don't change frequently
2. **Handle missing translations** - Always provide a fallback to the enum ID if a translation is missing for a specific language
3. **Use appropriate enum types** - Match the enum type to your use case (e.g., use `amenities` for hotel facilities, `restaurant_dining_options` for restaurant features)
4. **Support parameterized values** - Some enum values (like `award_names` and `other`) include placeholders that require dynamic content insertion