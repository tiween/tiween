# Watchlist Translations - Required for Epic 5 Completion

Add the following `watchlist` namespace to each locale file.

## 1. French (apps/client/locales/fr.json)

Add before the closing `}`:

```json
  "watchlist": {
    "pageTitle": "Ma liste - Tiween",
    "pageDescription": "Gérez votre liste d'événements favoris sur Tiween",
    "title": "Ma liste",
    "subtitle": "Vos événements favoris",
    "empty": {
      "title": "Votre liste est vide",
      "description": "Ajoutez des événements à votre liste en cliquant sur le cœur pour les retrouver facilement.",
      "action": "Parcourir les événements"
    },
    "addToWatchlist": "Ajouter à ma liste",
    "removeFromWatchlist": "Retirer de ma liste",
    "priceFrom": "À partir de {price}",
    "browseEvents": "Parcourir les événements",
    "loading": "Chargement de votre liste...",
    "error": "Impossible de charger votre liste",
    "retry": "Réessayer"
  }
```

## 2. English (apps/client/locales/en.json)

Add before the closing `}`:

```json
  "watchlist": {
    "pageTitle": "My Watchlist - Tiween",
    "pageDescription": "Manage your favorite events on Tiween",
    "title": "My Watchlist",
    "subtitle": "Your favorite events",
    "empty": {
      "title": "Your watchlist is empty",
      "description": "Add events to your watchlist by clicking the heart icon to find them easily.",
      "action": "Browse events"
    },
    "addToWatchlist": "Add to watchlist",
    "removeFromWatchlist": "Remove from watchlist",
    "priceFrom": "From {price}",
    "browseEvents": "Browse events",
    "loading": "Loading your watchlist...",
    "error": "Unable to load your watchlist",
    "retry": "Retry"
  }
```

## 3. Arabic (apps/client/locales/ar.json)

Add before the closing `}`:

```json
  "watchlist": {
    "pageTitle": "قائمتي - Tiween",
    "pageDescription": "إدارة فعالياتك المفضلة على Tiween",
    "title": "قائمتي",
    "subtitle": "فعالياتك المفضلة",
    "empty": {
      "title": "قائمتك فارغة",
      "description": "أضف الفعاليات إلى قائمتك بالنقر على القلب للعثور عليها بسهولة.",
      "action": "تصفح الفعاليات"
    },
    "addToWatchlist": "أضف إلى القائمة",
    "removeFromWatchlist": "إزالة من القائمة",
    "priceFrom": "ابتداءً من {price}",
    "browseEvents": "تصفح الفعاليات",
    "loading": "جاري تحميل قائمتك...",
    "error": "تعذر تحميل قائمتك",
    "retry": "إعادة المحاولة"
  }
```

## After Adding Translations

The watchlist page at `/[locale]/watchlist` will be fully functional with:

- Proper SEO metadata
- Localized empty state
- Heart button labels
- Loading/error states

This completes Epic 5 (Watchlist) implementation.
