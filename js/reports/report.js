'use strict';

class Reports {
    constructor() {
        this.мапОтчетов = new Map();
        this.мапПутейКОтчетам = new Map();
        this.НаправлениеВывода = 1; // 1 - на экран, 2 - на принтер, 3 - в файл
        this._ТекущийВывод = 0;
    }

    Add(nameClass, nameReport) {
        this.мапОтчетов.set(nameClass, nameReport);
        this.мапПутейКОтчетам.set( nameClass, GetReportDir() );
    }
    
    КаталогОтчета( имяКласса )
    {
       return this.мапПутейКОтчетам.get( имяКласса );
    }

    // Есть ли отчеты, начинающиеся на строку nameReport
    IsReport(nameReport) {
        for (var value of this.мапОтчетов.values()) {
            if (value.substr(0, nameReport.length) == nameReport) {
                return true;
            }
        }
        return false;
    }

    // Получить список отчетов, начинающиеся на строку nameReport
    GetReports(nameReport) {
        var listRep = {};
        for (var value of this.мапОтчетов.values()) {
            if (value.substr(0, nameReport.length) == nameReport) {
                listRep[value] = value;
            }
        }
        return listRep;
    }

    // получить Имя класса по имени отчета
    GetClass(nameReport) {
        for (var keys of this.мапОтчетов.keys()) {
            if (this.мапОтчетов.get(keys) == nameReport) {
                return keys;
            }
        }
        return undefined;
    }

    // Создать класс отчета
    CreateReport(nameReport) {
        let className = this.GetClass(nameReport);
        let objR = undefined;
        if (className) {
            try {
                objR = eval("new " + className + "()");
            }
            catch (err) {
                //Сообщить("Класс отчета \"" + className +"\" не найден","OK,WARNING");
            }
        }
        else {
            //Сообщить("Отчет \"" + nameReport +"\" не найден","OK,WARNING");
        }
        return objR;
    }

    /**
     * Выполняет произвольный отчет (Аналог ВыполнитьОтчет())
     * @param nameReport {String} Полное название отчета
     * @param reportContext {StackObj=} Контексты отчета (будет передан в объектОтчета[ИмяКонтекста] = reportContext[ИмяКонтекста])
     * @param countEx {Number=} Количество копий (1 - если не указано)
     * @param chapters {String=} Список разделов (методов) через запятую, которые необходимо вызвать (если не передан - будет вызван метод Строка() если он существует)
     * @returns {Object} Объект класса отчета, если существует
     */
    ExecuteReport(nameReport, reportContext, countEx, chapters) {
        countEx = countEx || 1;
        let chaptersArray = chapters ? chapters.split(",") : ["Строка"];
        let report = this.CreateReport(nameReport);
        if (report) {

            // устанавливаем "контексты" отчета, если он передан
            if(reportContext) {
                for(let конекст in reportContext) {
                    if (reportContext.hasOwnProperty(конекст))
                        report[конекст] = reportContext[конекст];
                }
            }
            for (let ind = 0; ind < countEx; ind++) {
                for (let chapter of chaptersArray) {
                    chapter = chapter.trim();
                    // Если есть раздел (метод) у отчета, то вызываем его
                    if (typeof report[chapter] == "function") {
                        report[chapter]();
                    }
                }
            }
        }
        return report;
    }

    // Открываем массовый вывод (1 - экран, 2 - сразу на принтер)
    OpenSpool(НаправлениеВывода) {
        this.НаправлениеВывода = НаправлениеВывода || this.НаправлениеВывода;
        switch (this.НаправлениеВывода) {
            case 1:
                Запустить("CLIENT:start_view_spool");
                this._ТекущийВывод = 1;
                break;
            case 2:
                Запустить("CLIENT:start_print_spool");
                this._ТекущийВывод = 2;
                break;

        }
    }

    // Закрываем массовый вывод
    StopSpool() {
        switch (this._ТекущийВывод) {
            case 1:
                Запустить("CLIENT:stop_view_spool");
                this._ТекущийВывод = 0;
                break;
            case 2:
                Запустить("CLIENT:stop_print_spool");
                this._ТекущийВывод = 0;
                break;
            default:
                throw new StackError("Массовая печать не инициализирована функцией НачатьМассовуюПечать()");
        }
    }

    SetCurrentScript(currentScript) {
        this.cu = currentScript;
    }
}
var отчеты = new Reports();

/**
 * Базовый класс для отчетов в формате Birt
 * @class BirtObj
 */
class BirtObj {
    constructor() {
        //TODO добавить рассылку, проверку на ошибки,etc
        this.ТипОтчета = "Birt";
        /**
         * Построитель отчета Birt (ПостроительОтчета("Birt"))
         * Инициализизируется методом [УстановитьШаблон()]{@link BirtObj#УстановитьШаблон}
         * @type {StackObj}
         */
        this.Построитель = undefined;
        /**
         * Путь к шаблону Birt
         * @type {String}
         */
        this.Шаблон = undefined;
        this.ВыходнойФайл = undefined;
        /**
         * Источники наборов данных
         * Устанавливаются методом [ОпределитьИсточникДанных()]{@link BirtObj#ОпределитьИсточникДанных}
         * @type {{StackObj}}
         */
        this.Источники = {};
    }

    /**
     * Устанавливает шаблон и инициализирует Построитель отчета
     * @param шаблон {String} Путь к шаблону в формате "SHABLON\Задача\Шаблон_отчета.rptdesign"
     */
    УстановитьШаблон(шаблон) {
        this.Шаблон = отчеты.КаталогОтчета(this.constructor.name) + шаблон;
        this.Построитель = ПостроительОтчета(this.ТипОтчета);
        this.Построитель.Имя(this.Шаблон);
    }

    /**
     * Инициализирует источник данных
     * @param Имя {String} Имя набора данных
     * @param Поля {String} Поля набора данных
     * @param Родитель {String=} Имя родительского набора данных,если текущий набор наследуемый
     */
    ОпределитьИсточникДанных(Имя, Поля, Родитель) {
        if (Родитель)
            this.Источники[Имя] = this.Источники[Родитель].Источник(Имя, Поля);
        else {
            this.Источники[Имя] = this.Построитель.Источник(Имя, Поля);
        }
    }

    /**
     * Переносит Данные в источник Birt
     * Перед использованием необходимо [УстановитьШаблон()]{@link BirtObj#УстановитьШаблон} и [ОпределитьИсточникДанных()]{@link BirtObj#ОпределитьИсточникДанных}
     * @param ИмяИсточника {String} Имя набора данных
     * @param Данные {{}} Данные, которые необходимо передать в источник
     * @param Родитель {String=} Имя родительского набора данных, если текущий набор наследуемый
     */
    ДобавитьВИсточник(ИмяИсточника, Данные, Родитель) {
        if (Родитель)
            this.Источники[Родитель].Добавить(ИмяИсточника, Данные);
        else
            this.Построитель.Добавить(ИмяИсточника, Данные);

    }

    /**
     * Формирует отчет на экран\в файл\etc...
     */
    Построить() {
        this.Построитель.Отчет();
    }
}

/**
 * Базовый класс для отчетов в формате Open Office
 * @class OpenOfficeObj
 */
class OpenOfficeObj extends BirtObj {
    constructor() {
        super();
        this.ТипОтчета = "Open Office";
    }
}