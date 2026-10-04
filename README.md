# Nazwane

Nazwane to mała strona do luźnej myśli. Wpisujesz kilka zdań, jak notatkę. Krótka animacja układa słowa, symbole i proste znaki, a potem dostajesz rzeczową odpowiedź: czy podobną myśl ktoś już wyraził i nazwał.

Strona jest po polsku. Działa po otwarciu pliku `index.html` i na GitHub Pages. Nie ma kroku budowania ani zależności npm.

## Analiza

Analiza jest lokalnym katalogiem, nie modelem. Funkcja `analyzeThought` w `app.js` porównuje tekst ze spisem myślicieli w `data.js` (słowa i tematy). Gdy katalog nie ma bliskiej paraleli, strona mówi o tym wprost i nie wymyśla imienia.

Komentarz nad `analyzeThought` wskazuje miejsce, w którym później można podpiąć model. Obecny wynik pochodzi tylko z katalogu.

## Premium i feed

Premium to przełącznik na tym urządzeniu. Płatności nie są podpięte. Włączenie pokazuje jedno ostrożne zdanie w stylu „świadczy to o tym, że jesteś osobą …”. Jest podpisane jako ostrożne odczytanie, nie diagnoza.

Feed zapisuje udostępnione wyniki i komentarze w `localStorage` przeglądarki. Jest na tym urządzeniu, nie na wspólnym serwerze. W `data.js` są cztery przykładowe wpisy.

## Moderacja

Funkcja `moderate` zwraca `{ ok, reason }`. Zatrzymuje wulgaryzmy, obelgi użyte jako atak, wezwania do przemocy i oczywiste zachęty do czynów zabronionych, także proste wzorce znaczenia, nie samą listę słów. Odrzucenie jest spokojne i nie powtarza zablokowanego tekstu. Myśl krótsza niż około 15 znaków prosi o pełniejszy zapis zamiast analizy.

## Adres

https://miferst-lab.github.io/nazwane/

Pliki: `index.html`, `styles.css`, `app.js`, `data.js`.
