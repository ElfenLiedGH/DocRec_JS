'use strict';
/**
 * @module Прототипы
 */

/**
 * @class Error
 */

/**
 *
 * ОбработкаОшибки() для совместимости с классом StackError
 */

TypeError.prototype.ОбработкаОшибки = function(){
    StackMessenger.Показать( this.message + "\n" + this.stack );
};

RangeError.prototype.ОбработкаОшибки = function(){
    StackMessenger.Показать( this.message + "\n" + this.stack );
};

ReferenceError.prototype.ОбработкаОшибки = function(){
    StackMessenger.Показать( this.message + "\n" + this.stack );
};

SyntaxError.prototype.ОбработкаОшибки = function(){
    StackMessenger.Показать( this.message + "\n" + this.stack );
};


/**
 * @class Date
 */

/**
 * toSQLString() Преобразует Date в ISO формат
 * @returns {String} YYYY-MM-DD
 *
 */
// TODO выпилить и поменять на format
Date.prototype.toSQLString = function() {
    return this.getFullYear() + '-' + ('00' + (this.getMonth() + 1)).slice(-2) + '-' + ('00' + this.getDate()).slice(-2);
};
/**
 * isEmpty() Пустая дата или нет
 * @returns {boolean} true, если пустая
 *
 */
Date.prototype.isEmpty = function() {
    return this <= new Date("1701-01-01");
};
/**
 * Возвращает дробное число часов, например 4:30, будет 4.5
 * @returns {number}
 */
Date.prototype.ПолноеКоличествоЧасов = function(){
    return this.getHours() + this.getMinutes() / 60;
}
/*
 * Date Format 1.2.3
 * MIT license
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */
var dateFormat = function () {
    var	token = /d{1,4}|M{1,5}|yy(?:yy)?|([hHmsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
        timezoneClip = /[^-+\dA-Z]/g,
        pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    // Regexes and supporting functions are cached through closure
    return function (date, mask, utc) {
        var dF = dateFormat;

        // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
        if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
            mask = date;
            date = undefined;
        }

        // Passing date through Date applies Date.parse, if necessary
        date = date ? new Date(date) : new Date;
        if (isNaN(date)) throw SyntaxError("invalid date");

        mask = String(dF.masks[mask] || mask || dF.masks["default"]);

        // Allow setting the utc argument via the mask
        if (mask.slice(0, 4) == "UTC:") {
            mask = mask.slice(4);
            utc = true;
        }

        var	_ = utc ? "getUTC" : "get",
            d = date[_ + "Date"](),
            D = date[_ + "Day"](),
            M = date[_ + "Month"](),
            y = date[_ + "FullYear"](),
            H = date[_ + "Hours"](),
            m = date[_ + "Minutes"](),
            s = date[_ + "Seconds"](),
            L = date[_ + "Milliseconds"](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                'd':    d,
                'dd':   pad(d),
                'ddd':  dF.i18n.dayNames[D],
                'dddd': dF.i18n.dayNames[D + 7],
                'M':    M + 1,
                'MM':   pad(M + 1),
                'MMM':  dF.i18n.monthNames[M],
                'MMMM': dF.i18n.monthNames[M + 12],
                'MMMMM': dF.i18n.monthNames[M + 24],
                'yy':   String(y).slice(2),
                'yyyy': y,
                'h':    H % 12 || 12,
                'hh':   pad(H % 12 || 12),
                'H':    H,
                'HH':   pad(H),
                'HHH':  pad(H, 3),
                'm':    m,
                'mm':   pad(m),
                's':    s,
                'ss':   pad(s),
                'l':    pad(L, 3),
                'L':    pad(L > 99 ? Math.round(L / 10) : L),
                't':    H < 12 ? "a"  : "p",
                'tt':   H < 12 ? "am" : "pm",
                'T':    H < 12 ? "A"  : "P",
                'TT':   H < 12 ? "AM" : "PM",
                'Z':    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                'o':    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                'S':    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };

        return mask.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
}();

// Some common format strings
dateFormat.masks = {
    'default':        "ddd MMM dd yyyy HH:mm:ss",
    'shortDate':      "M/d/yy",
    'mediumDate':     "MMM d, yyyy",
    'longDate':       "MMMM d, yyyy",
    'fullDate':       "dddd, MMMM d, yyyy",
    'shortTime':      "h:mm TT",
    'mediumTime':     "h:mm:ss TT",
    'longTime':       "h:mm:ss TT Z",
    'isoDate':        "yyyy-MM-dd",
    'isoTime':        "HH:mm:ss",
    'isoDateTime':    "yyyy-MM-dd'T'HH:mm:ss",
    'isoUtcDateTime': "UTC:yyyy-MM-dd'T'HH:mm:ss'Z'",
    'rusDate':        "dd.MM.yyyy",
	 'rusDateDashed':  "dd-MM-yyyy",
    'rusDateTime':    "dd.MM.yyyy HH:mm:ss"
};

// Internationalization strings
dateFormat.i18n = {
    dayNames: [
        "Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб",
        "Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"
    ],
    monthNames: [
        "Янв", "Фев", "Март", "Апр", "Май", "Июнь", "Июль", "Авг", "Сен", "Окт", "Нояб", "Дек",
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
        "января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ]
};

Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};

Date.prototype.ДеньНедели = function(){
    return dateFormat.i18n.dayNames[this.getDay()+7];
};

/**
 *
 * @returns {string} месяц прописью
 */
Date.prototype.МесяцПрописью = function() {
    return dateFormat.i18n.monthNames[this.getMonth()+12];
};

/**
 *
 * @returns {string} месяц прописью в родительно падеже
 */
Date.prototype.МесяцПрописьюВРодительномПадеже = function() {
    return dateFormat.i18n.monthNames[this.getMonth()+24];
};

/**
 *
 * @param смещение
 * @returns {Date}
 */
Date.prototype.СледующийМесяц = function( смещение ) {
    return new Date(this.getFullYear(), this.getMonth() + ( смещение===undefined ? 1 : смещение),1);
};
/**
 * Возвращает новую дату
 * @returns {Date}
 */
Date.prototype.НачалоМесяца= function() {
    return this.СледующийМесяц(0);
};

/**
 *
 * @returns {Date}
 */
Date.prototype.ПоследнееЧисло = function() {
    return new Date(this.getFullYear(), this.getMonth() + 1,0);
};
/**
 * Изменяет дату текущей переменной
 * @param {string} datepart компонент даты, день/месяц/год, час минута
 * @param {number} number выражение, которое добавляется к компоненту даты
 * @returns {Date}
 */
Date.prototype.ПрибавитьДату = function( datepart, number ) {
    switch (datepart.toLowerCase()) {
        case "year":
        case "год":
        case "yyyy":
        case "yy":
        case "y":
        case "год":
        case "гггг":
        case "гг":
        case "г":
            this.setYear(this.getFullYear() + number);
            break;
        case "month":
        case "MM":
        case "M":
        case "месяц":
        case "ММ":
        case "М":
            this.setMonth(this.getMonth() + number);
            break;
        case "day":
        case "dd":
        case "d":
        case "день":
        case "дд":
        case "д":
            this.setDate(this.getDate() + number);
            break;
        case "minute":
        case "mm":
        case "m":
        case "минута":
        case "мм":
        case "м":
            this.setMinutes(this.getMinutes() + number);
            break;
        case "hour":
        case "hh":
        case "h":
        case "час":
        case "чч":
        case "ч":
            this.setHours(this.getHours() + number);
            break;
    }
    return this;
};


/**
 *
 * @returns {Date}
 */
Date.prototype.withoutTime = function() {
    return new Date(this.getFullYear(), this.getMonth(), this.getDate());
};

/**
 * сравнивает две даты без учета времени
 * @returns {boolean} true, если равны, false в противном случае
 */
Date.prototype.equalsWithoutTime = function( date ){
    return this.getDate() == date.getDate() && this.getMonth() == date.getMonth() && this.getFullYear() == date.getFullYear();
}

/**
 * todo проверить
 * @param date
 * @returns {boolean}
 */
Date.prototype.equals = function( date ){
    return Math.round( (this.getTime() - date.getTime())/1000 ) == 0;
}
/**
 * todo уже есть такой выше - withoutTime
 * Для возможности вызова как у дат, так и у строк не разбираясь
 * @returns {Date}
 */
Date.prototype.toDate = function(){
    return new Date( this.getFullYear(), this.getMonth(), this.getDate() );
}
/**
 * @param date
 * @returns {Number}
 */
Date.prototype.countOfDayBetweenDates = function( date ){
    return Math.ceil( (this.getTime() - date.getTime())/86400000 );
}

/**
 * @class Array
 */

/**
 * binarySearch Бинарный поиск по массиву объектов
 * @param forFind искомый элемент
 * @param cmpFunction функция компаратор
 * @returns {*} возвращает индекс искомого элемента либо undefined, если не найден
 */
Array.prototype.binarySearch = function( forFind, cmpFunction ) {
    /* Номер первого элемента в массиве */
    var first = 0;
    /* Номер элемента в массиве, СЛЕДУЮЩЕГО ЗА последним */
    var last = this.length;

    /* Начальная проверка, которую, в принципе, можно опустить — но тогда см. ниже! */
    if ( n == 0 ) {
        /* массив пуст */
        return undefined;
    } else if ( cmpFunction(this[0], forFind) > 0 ) {
        /* искомый элемент меньше всех в массиве */
        return undefined;
    } else if ( cmpFunction(this[n - 1], forFind) < 0 ) {
        /* искомый элемент больше всех в массиве */
        return undefined;
    }

    /* Если просматриваемый участок непустой, first < last */
    while ( first < last ) {
        /* ВНИМАНИЕ! В отличие от более простого (first + last) / 2,
         * этот код устойчив к переполнениям.
         *
         * Если first и last знаковые, возможен код:
         * ((unsigned)first + (unsigned)last) >> 1.
         * Соотвественно в Java: (first + last) >>> 1.
         */
        let mid = first + (last - first) / 2;

        if ( cmpFunction(forFind, this[mid]) <= 0 )
            last = mid; else
            first = mid + 1;
    }

    if ( cmpFunction(this[last], forFind) == 0 ) {
        /* Искомый элемент найден. last - искомый индекс */
        return last;
    } else {
        /* Искомый элемент не найден. Но если вам вдруг надо его
         * вставить со сдвигом, то его место - last.
         */
        return undefined;
    }
    //}
};

/**
 * toCommaString переводит массив в строку через запятую.
 * @returns {string} Строка со значениями массива через запятую
 */
Array.prototype.toCommaString = function() {
    var res = '';
    for (let инд in this)
        if (this.hasOwnProperty( инд ))
            res += this[инд] + ',';
    return res.substring(0,res.length-1);
};
/**
 * @class String
 */

/**
 * заменяет все вхождения подстроки чтоЗаменить на наЧтоЗаменить, кроме '\'
 * @param чтоЗаменить
 * @param наЧтоЗаменить
 * @returns {string}
 */
String.prototype.replaceAll = function( чтоЗаменить, наЧтоЗаменить ) {
    return this.replace(new RegExp(чтоЗаменить, 'g'), наЧтоЗаменить);
};
/**
 *
 * @returns {boolean}
 */
String.prototype.ЕстьСмесьАлфавитов = function() {
    return !(/[а-яёА-ЯЁ]/g.test(this) && /[a-zA-Z]/g.test(this));
};

/**
 * Возвращает новую дату, полученную из строки
 * Преобразует строку формата rusDate в Дату
 * // TODO возможно неадекватное поведение при кривых входных данных, добавить проверки
 * @returns {Date}
 */
String.prototype.toDate = function() {
    if( this.length < 10 )
        return new Date( 1980, 0, 1 );
    var мДата = this.split( "." );
    return new Date( мДата[2], мДата[1] - 1, мДата[0] );
};


/**
 * Возвращает транслитеризированную строку
 * @param ОставитьСпецСимволы если false То удаляет
 * @returns {string}
 */
String.prototype.Транслитерация = function( ОставитьСпецСимволы ) {
// Символ, на который будут заменяться все спецсимволы
    var space = '';
// Берем значение и переводим в нижний регистр
    var text = this;

// Массив для транслитерации
    var transl = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
        'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
        'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h',
        'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': space, 'ы': 'y', 'ь': space, 'э': 'e', 'ю': 'yu', 'я': 'ya',
        ' ': space, '_': space, '`': space, '~': space, '!': space, '@': space,
        '#': space, '$': space, '%': space, '^': space, '&': space, '*': space,
        '(': space, ')': space, '-': space, '\=': space, '+': space, '[': space,
        ']': space, '\\': space, '|': space, '/': space, '.': space, ',': space,
        '{': space, '}': space, '\'': space, '"': space, ';': space, ':': space,
        '?': space, '<': space, '>': space, '№': space
    };
    var result = '';
    var curent_sim = '';
    for (let i = 0; i < text.length; i++) {
        // Если символ найден в массиве то меняем его
        if (transl[text[i].toLowerCase()] && ( !ОставитьСпецСимволы || transl[text[i]] != space ) ) {
            if (curent_sim != transl[text[i]] || curent_sim != space) {
                result += transl[text[i]] ? transl[text[i]] : transl[text[i].toLowerCase()].toUpperCase();
                curent_sim = transl[text[i]];
            }
        }
        // Если нет, то оставляем так как есть
        else {
            result += text[i];
            curent_sim = text[i];
        }
    }
    return result;
};

/**
 * Конвертирует переданную строку из DOS-кодировки в Win-кодировку и возвращает результат
 * Внимание - буквы Ё в Win кодировке имеют по два кода, поэтому строка DOS в этой функции и Win2Dos отличается
 * @returns {string}
 */
String.prototype.Dos2Win = function(){
    var WIN = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмноп░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀рстуфхцчшщъыьэюяЁёЄєЇїЎў°∙·√№¤■ и╕";
    var DOS = "                                                         №      АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюяЁё";
    var Стр2 = ``;
    var н = 0;
    var Символ, поз;
    while( н < this.length )
    {
        Символ = this.charAt( н );
        if( Символ != " " )
        {
            поз = DOS.indexOf( Символ );
            if( поз > 0 )
                Стр2 += WIN.charAt( поз );
            else
                Стр2 += Символ;
        } else
            Стр2 += ` `;
        н++;
    }
    return Стр2;
};

/**
 * @class Number
 */

/**
 * @param n
 * @returns {string}
 */

Number.prototype.ЧислоСВедущимиНулями = function( n ){
    var nstr = this.toString();
    if( n == nstr.length ) return nstr;
    return '00000000000000000000'.slice( 20-n, -nstr.length ) + this;
};

/**
 * Переводит число (или деньги) в текстовое представление
 * @param {String=} desc "RUR" - Считаем, что это российская валюта, если не указано, считаем что это целое число.
 * @returns {string} Число или сумма прописью.
 */
Number.prototype.Прописью = function (desc) {
    const WORD1 = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять",
        "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать",
        "восемнадцать", "девятнадцать"];
    const WORD20 = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
    const WORD100 = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];
    const RAZR = {
        "RUR": ["рубль", "рубля", "рублей"],
        "KOP": ["копейка", "копейки", "копеек"],
        1: ["тысяча", "тысячи", "тысяч"],
        2: ["миллион", "миллиона", "миллионов"],
        3: ["миллиард", "миллиарда", "миллиардов"]
    };
    var _ref = this.toFixed(2).split('.');
    var rub = _ref[0];
    var kop = _ref[1];
    var _lastdigit = 0;
    var res = '';
    var aRazr1000 = [];
    // разобъем по разрядам сотни, тыщи, миллионы и тд...
    for (; rub > 0.9999; rub /= 1000) {
        aRazr1000.push(Math.floor(rub % 1000));
    }
    // всё что больше 999 вызовем рекурсивно этой же функцией
    while (aRazr1000.length > 0) {
        rub = aRazr1000.pop();
        if (aRazr1000.length > 0) {
            res += rub.Прописью(aRazr1000.length);
        }
    }
    rub = rub.toString();
    // сотни
    if (rub.length == 3) {
        res += WORD100[rub.substring(0, 1)] + ' ';
        rub = rub.substring(1);
    }
    // 1-19
    if (Number(rub) > 0) {
        if (Number(rub) < 20) {
            res += WORD1[Number(rub)] + ' ';
        }
        // 20-99
        else {
            res += WORD20[rub.substring(0, 1)] + ' ' + WORD1[rub.substring(1, 2)] + ' ';
        }
    }
    switch (desc) {
        case "RUR": // Российский рубль
        case 1:// тысячи
        case 2:// миллионы
        case 3:// миллиарды
            _lastdigit = rub.length > 1 && rub.substr(-2, 1) == 1 ? rub.substr(-2) : rub.substr(-1);
            if (_lastdigit == 1)
                res += RAZR[desc][0] + ' ';
            else if (_lastdigit > 1 && _lastdigit < 5) res += RAZR[desc][1] + ' ';
            else res += RAZR[desc][2] + ' ';
            if (desc == 1) {
                res = res.replace('один ', 'одна ');
                res = res.replace('два ', 'две ');
            }
            // Копейки всегда пишем цифрами и только когда "RUR"
            if (kop && desc == "RUR") {
                _lastdigit = kop.length > 1 && kop.substr(-2, 1) == 1 ? kop.substr(-2) : kop.substr(-1);
                res += ' ' + kop + ' ';
                if (_lastdigit == 1)
                    res += RAZR["KOP"][0];
                else if (_lastdigit > 1 && _lastdigit < 5) res += RAZR["KOP"][1];
                else res += RAZR["KOP"][2];
            }
            break;
    }
    // Капчим первый символ
    return res.charAt(0).toUpperCase() + res.substr(1).toLowerCase();
};

Number.prototype._toFixed = Number.prototype.toFixed;
Number.prototype.toFixed = function( precision ) {
    var newNumber = this;
    var factor = Math.pow( 10, precision||0 );
    newNumber *= factor;
    newNumber = newNumber._toFixed(2);
    newNumber = Math.round( newNumber );
    newNumber /= factor;
    return newNumber._toFixed( precision );
}

/**
 * Копирует объект
 * @param copy
 * @returns {*}
 */
function КопироватьОбъект(copy) {
    var obj = (copy instanceof Array) ? [] : {};
    for (let key in copy) {
        if (copy.hasOwnProperty(key)) {
            if (copy[key] && typeof copy[key] == "object") {
                obj[key] = КопироватьОбъект(copy[key]);
            } else obj[key] = copy[key]
        }
    }
    return obj;
}

function ВремяСТремяНулями( минуты )
{
   return (Math.trunc(минуты / 60)).ЧислоСВедущимиНулями(3) + ":" + (минуты % 60).ЧислоСВедущимиНулями(2);
}