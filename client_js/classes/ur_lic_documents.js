'use strict';
/**
 * @module Юридические лица
 */
class кНДСКалькулятор{
    static СуммаСНДС(СуммаБезНДС, СтавкаНДС) {
        return (( СуммаБезНДС * (100 + СтавкаНДС) / 100.0).toFixed(2));
    }

    static СуммаБезНДС(СуммаСНДС, СтавкаНДС) {
        return ( СуммаСНДС*100.0/(100.0 + СтавкаНДС) ).toFixed(2);
    }
}

/**
 * @class базовый класс для работы с папками документов и прочих иерархических справочников
 * рекомендуется использовать потомки этого класса
 */
class кПапка {
    constructor(ИмяТаблицы, ПолеИерархии, ПолеНазвания) {
        this.ИмяТаблицы = ИмяТаблицы;
        this.ПолеИерархии = ПолеИерархии;
        this.ПолеНазвания = ПолеНазвания;


        this.Поля = {
            "Список" : {},
            "Добавить" : function(ИмяПоля, Значение) {this.Список[ИмяПоля] = Значение;},
            "ДобавитьСписок" : function(ДополнительныйСписок) {
                for(let ИмяПоля in ДополнительныйСписок) {
                    this.Добавить(ИмяПоля, ДополнительныйСписок[ИмяПоля])
                }
            },
            "Очистить" : function() {
                delete this.Список;
                this.Список = {};
                this.Добавить(ПолеИерархии + '_Узел', 1)
            }
        };

        this.ДополнительныеПоля = {
            "Список" : {},
            "Добавить" : function(ИмяПоля, Значение) {
                this.Список[ИмяПоля] = Значение;
            },
            "ДобавитьСписок" : function(ДополнительныйСписок) {
                for(let ИмяПоля in ДополнительныйСписок)
                    this.Добавить(ИмяПоля, ДополнительныйСписок[ИмяПоля])
            },
            "Очистить" : function() {
                delete this.Список;
                this.Список = {};
                this.Добавить(ПолеИерархии + '_Узел', 1)
            }
        };

        this.Поля.Очистить();
    }

    ПолучитьДоступныйКорень(){
        return -10;
    }

    Найти (Название, нзКорень) {
        let зНайтиПапку = Query(`
            SELECT TOP 1 t.ROW_ID нзПапки
            FROM ~` + this.ИмяТаблицы + `~  t
            WHERE t.` + this.ПолеНазвания + ` = :1
            AND t.` + this.ПолеИерархии + ` = :2
            AND t.` + this.ПолеИерархии + `_ADD = 0
            `, 10, "p1,A,p2,S");
        if(!нзКорень) нзКорень = ПолучитьДоступныйКорень();
        зНайтиПапку.УстановитьПараметры(Название, нзКорень);
        return зНайтиПапку.Следующий() ? зНайтиПапку.нзПапки : false;
    }

    Создать (Название, ДополнительныеПоля, нзПапка) {
        let оПапка = new БазовыйОбъект(this.ИмяТаблицы);
        if(!нзПапка) нзПапка = this.ПолучитьДоступныйКорень();
        this.Поля.Добавить(this.ПолеНазвания, Название);
        this.Поля.Добавить(this.ПолеИерархии, нзПапка);
        this.Поля.ДобавитьСписок(this.ДополнительныеПоля.Список);
        this.Поля.ДобавитьСписок(ДополнительныеПоля);
        оПапка.ПрочитатьИзКонтекста(this.Поля.Список);
        this.Поля.Очистить();
        return оПапка.Внести();
    }
}

class кПапкаСФ extends кПапка {
    constructor(){
        super("Документ", "Папки", "Примечание");
        this.ДополнительныеПоля.Добавить("Тип документа", 35, 'S');
        this.ДополнительныеПоля.Добавить("Дата", new Date());
    }

    ПолучитьДоступныйКорень(){
        //Почему-то не работает
        //Сообщить(ДоступныйКореньДокументов( "Счета-фактуры", 35 ));
        //return ДоступныйКореньДокументов( "Счета-фактуры", 35 );
        let зПоискКорня = Query(`
            SELECT d.ROW_ID нзКорень
            FROM ~Документ~ d
            WHERE d.[Тип документа] in (36)
            AND d.Папки = -10;
            `, 1, "");

        зПоискКорня.УстановитьПараметры();
        return зПоискКорня.Следующий() ? зПоискКорня.нзКорень : -10;
    }
}

class кПапкаСФАванс extends кПапка {
    constructor(){
        super("Документ", "Папки", "Примечание");
        this.ДополнительныеПоля.Добавить("Тип документа", 4, 'S');
        this.ДополнительныеПоля.Добавить("Дата", new Date());
    }

    ПолучитьДоступныйКорень(){
        return ДоступныйКореньДокументов( "Счета-фактуры на авансы", 36 );
    }
}

class кФабрикаПапкаДокументов {
    static Создать(ТипДокумента) {
        switch (Number( ТипДокумента )) {
            case 4: return new кПапкаСФАванс();
            case 35: return new кПапкаСФ();
        }
    }
}

class кОшибкиФормированияДокументов extends Error {
    constructor(ТекстОшибки){
        super(ТекстОшибки);
        /*
        Возможные ошибки:
        1. Документ уже создан
        2. Не удалось подобрать номер
        3. Не удалось создать папку
        4. Не указан продавец
        5. Месяц закрыт (в закрытых месяцах формирование запрещено)
        6. Нет начислений для формирования документа
         */
        this.Имя = 'Формирование исходящего документа';
        this.Текст = ТекстОшибки || 'Ошибка формирования исходящего документа';
    }
}

/**
 * @extends кДокумент
 * @class класс кИсходящийДокумент базовый класс для формирования исходящих документов
 */
class кИсходящийДокумент extends кДокумент {
    /**
     *
     * @param Договор
     * @param ДатаДокумента
     * @param МесяцДокумента
     */
    constructor(Договор, ДатаДокумента, МесяцДокумента) {
        /**
         * TODO проверка входящих параметров
         */

        super();

        /**
         *
         */
        this.Договор = Договор;

        /**
         *
         */
        this.Дата = ДатаДокумента;

        /**
         *
         */
        this.Месяц = МесяцДокумента;

        /**
         *
         */
        this.Номер = 1;
        this.Тема = "";
        this.Примечание = "";

        /**
         *  TODO Стоит ли лепить в базовом классе???
         *  Вариант нумерации документов 1 - СКВОЗНАЯ, 0 - РАЗДЕЛЬНАЯ
         *  Применяется для нумерации СФ и СФАванс
         */
        this.ВариантНумерации = Number(ПрочитатьКонстанту(МесяцДокумента, "НОМЕР_СФ"));

        /**
         * Определяет стоит ли пытаться достать номер из журнала изменений
         * возможно такой документ создавался ранее и необходимо его востанновить со старым номером
         * 'Исходящий счет'
         * 'Платежка'
         * 'Кассовый ордер'
         * 'Счет-фактура'
         * 'Платежная ведомость'
         * 'Ведомость субсидий'
         * 'Групповой счетчик'
         * 'Ведомость индивидуальных счетчиков'
         * 'Ведомость удержаний'
         */
        this.СохранятьНомерДокумента = (Number(ПрочитатьКонстанту(МесяцДокумента, "СОХРНОМДОК")) != 0);

        this.Тип = undefined;
        this.НомерИзИстории = undefined;
        /**
         * Группа нумерации - нужна для определения номера нового документа
         * @type {number}
         */
        this.ГруппаНумерации = 0;
        this.ИмяБлокировкиНомера = "";
    }

    ОбновитьИтоги(нзДокумент) {
        let зОбновитьИтоги = Command(`
            UPDATE ~Документ~ SET
                Кол_во = (
                    SELECT sum(Кол_во)
                    FROM ~Наименования счета~  ns
                    JOIN ~Номенклатура~ nom ON nom.ROW_ID = ns.[Склад-Наименования счета]
                    --WHERE nom.[Счетчика разрядность] > 0
                    AND ns.[Счет-Наименования] = ~Документ~.ROW_ID),
                Сумма  = (
                    SELECT sum(Сумма)
                    FROM ~Наименования счета~  ns
                    WHERE ns.[Счет-Наименования] = ~Документ~.ROW_ID),
                Сумма2  = (
                    SELECT Sum(Сумма2)
                    FROM ~Наименования счета~  ns
                    WHERE ns.[Счет-Наименования] = ~Документ~.ROW_ID)
            WHERE ROW_ID = :1
            `,1, "p1,S");
        зОбновитьИтоги.Выполнить(нзДокумент);
        зОбновитьИтоги.Завершить();

        return true;
    }

    /**
     * Ищет номер сформированного и удаленного документа
     * с такими реквизитами (Дата, Месяц, Договор, Тип Документа, Аналитика)
     * в журнале изменений.
     */
    ПолучитьНомерИзИстории() {
        if(this.НомерИзИстории === undefined) {
            this.НомерИзИстории = 0;
            var зПолучитьСтарыйНомер = Query(`
                DECLARE @dog INT;
                DECLARE @type INT;
                DECLARE @doc_type VARCHAR(256);
                DECLARE @doc_analit VARCHAR(256);
                DECLARE @date DATETIME;
                SET @dog = :1;
                SET @type = :2;
                SET @date = :3;
                SET @doc_analit = :4;
                SET @doc_type =
                    CASE @type
                        WHEN 1  THEN 'Исходящий счет'
                        WHEN 21 THEN 'Платежка'
                        WHEN 23 THEN 'Кассовый ордер'
                        WHEN 35 THEN 'Счет-фактура'
                        WHEN 67 THEN 'Платежная ведомость'
                        WHEN 68 THEN 'Ведомость субсидий'
                        WHEN 77 THEN 'Групповой счетчик'
                        WHEN 78 THEN 'Ведомость индивидуальных счетчиков'
                        WHEN 79 THEN 'Ведомость удержаний'
                    ELSE
                        stack.itoa( @type )
                    END
                
                SELECT TOP 1 stack.StrPart(Позиция, ',', 3) as Номер
                FROM ~Журнал изменений~ j
                WHERE Действие = 1
                AND j.[Журнал-Договор]=@dog
                AND [ИмяТаблицы] = 'Документ'
                AND stack.StrPart( SUBSTRING(Позиция,1, CHARINDEX(Позиция, ')')) , ',', 5) = @doc_analit
                AND CHARINDEX(@doc_type + ',' + stack.dtoa(@date), Позиция) > 0
                ORDER BY j.Дата DESC, j.Время DESC
                `, 1, "dog,S,td,S,date,D,analit,A");

            зПолучитьСтарыйНомер.УстановитьПараметры(
                this.Договор.НомерЗаписи,
                this.Тип,
                this.Дата,
                ""//this.Аналитика
                );
            if(зПолучитьСтарыйНомер.Следующий())
                this.НомерИзИстории = зПолучитьСтарыйНомер.Номер;
            return this.НомерИзИстории;
        }
        return false;
    }

    /**
     * Определяет свободный номер для нового документа данного типа
     */
    НомерПоПорядку () {
        let ЧислоПопыток = 50; // число попыток поиска незаблокированного свободного номера
        let зПоискПоследнегоНомера = Query(`
            SELECT MAX( Номер ) as Номер
            FROM ~Документ~ d
            WHERE d.[Тип документа] in (` + this.Тип + `)
            AND d.[Группа нумерации] = :1
            `, 1, "p1,S");

        зПоискПоследнегоНомера.УстановитьПараметры(this.ГруппаНумерации);
        this.Номер = зПоискПоследнегоНомера.Следующий() ? зПоискПоследнегоНомера.Номер + 1 : 1;
    }


    _ПроверитьЗанятостьНомера(Номер) {
        let зПроверитьНомер = Query(`
            select top 1 row_id
            from ~Документ~
            where [Тип документа] in (` + this.Тип + `)
            and [Группа нумерации] = :1
            and [Папки_ADD] = 1
            and Номер = :2
            `, 1, "p2,S,p3,S");

        зПроверитьНомер.УстановитьПараметры(this.ГруппаНумерации, Номер);
        return(!зПроверитьНомер.Следующий() && this.ИмяБлокировкиНомера && БлокироватьЗапись( this.ИмяБлокировкиНомера + Номер ));
    }



    ПолучитьНовыйНомер(ПредпочитаемыйНомер) {
        if(ПредпочитаемыйНомер && this._ПроверитьЗанятостьНомера(ПредпочитаемыйНомер)) {
            //Предпочитаемый номер
            this.Номер = ПредпочитаемыйНомер;
        } else if(this.СохранятьНомерДокумента && this.ПолучитьНомерИзИстории() && this._ПроверитьЗанятостьНомера(this.ПолучитьНомерИзИстории())) {
            //Номер из истории
            this.Номер = this.ПолучитьНомерИзИстории();
        } else {
            //Номер по порядку
            let ЧислоПопыток = 50;
            let ПотенциальныйНомер = this.НомерПоПорядку();
            while(!this._ПроверитьЗанятостьНомера(ПотенциальныйНомер) && ЧислоПопыток > 0) {
                ПотенциальныйНомер++;
                ЧислоПопыток--;
            }
        }

        return this.Номер;
    }

    ПолучитьТему () {
        this.Тема = this.Договор.Объект.Тема;
        return this.Тема;
    }

    ПолучитьПримечание () {
        this.Примечание = this.Месяц.format("За MMMM yyyy г.");
        return this.Примечание;
    }

    /**
     * Ищет папку документа с учетом данных договора, типа и месяца документа
     * @return номер записи папки
     */
    НайтиПапку() {
        /*
         Поиск папки осуществляется по нескольким критериям
         1. Папка должна соответствовать типу документа
         2. На папке или выше должен быть установлен продавец соответствующий продавцу
            по договору.
         3. Название папки (поле примечание) ГГГГ-ММ
         */

        //Папка продавца формате ГГГГ-ММ
        let НазваниеПапки = this.Месяц.toSQLString().substr(0, 7);
        let зНайтиПапку = Query(`
            --Список похожих папок
            ;WITH folders AS
            (
                SELECT d.ROW_ID, d.Лицо1 нзПродавец, d.ROW_ID нзПапки, d.Папки
                FROM docrec.stack.[Документ]  d
                WHERE d.Примечание = :1
                AND d.[Тип документа] = :2
                AND d.[Папки_ADD] = 0
                UNION ALL
                SELECT d2.ROW_ID, d2.Лицо1 нзПродавец, folders.нзПапки, d2.Папки
                FROM docrec.stack.[Документ] d2
                JOIN folders ON folders.Папки = d2.ROW_ID
            )

            --Нужная папка
            SELECT TOP 1 нзПапки
            FROM folders f
			WHERE нзПродавец = :3
            `, 10, "p1,A,p2,S,p3,S");
        зНайтиПапку.УстановитьПараметры(НазваниеПапки, this.Тип, this.Договор.нзПродавец);
        return зНайтиПапку.Следующий() ? зНайтиПапку.нзПапки : false;
    }

    СоздатьПапку() {

        /*
         Папка должна находиться в структуре
         ИмяПапкиДоговора1|ИмяПапкиДоговора2|...|ИмяПапкиДоговораN|ГГГГ|ГГГГ-ММ
         */

        //Поиск папки продавца верхнего уровня
        //Название должно соответствовать названию папки в договорах
        //Продавец должен соответствовать продавцу в договорах
        //???? возможно надо и грузоотправителя
        let зНайтиПапкуПродавца = Query(`
                SELECT d.Лицо1 нзПродавец, d.ROW_ID нзПапки, d.Папки
                FROM ~Документ~ d
                WHERE d.Примечание = :1
                AND d.[Тип документа] = :2
                AND d.[Папки_ADD] = 0
                AND d.Лицо1 = :3
                `, 10, "p1,A,p2,S,p3,S");

        let мИерархия = this.Договор.ИерархияПапок.split("|");

        var нзПапки = -10;
        var нзНоваяПапка = -10;
        var Папка = кФабрикаПапкаДокументов.Создать(this.Тип);
        if(мИерархия[0] != undefined) {
            //Иногда в качестве каталога договоров используют год в формате ГГГГ
            //Проверка такой ситуции
            let ПоследнийКаталог = мИерархия.pop();
            if(ПоследнийКаталог == this.Месяц.toSQLString().substr(0, 4))
                мИерархия.push(this.Месяц.toSQLString().substr(0, 4), this.Месяц.toSQLString().substr(0, 7));
            else
                мИерархия.push(ПоследнийКаталог, this.Месяц.toSQLString().substr(0, 4), this.Месяц.toSQLString().substr(0, 7))

            зНайтиПапкуПродавца.УстановитьПараметры(мИерархия[0], this.Тип, this.Договор.нзПродавец);
            if(!зНайтиПапкуПродавца.Следующий()) {
                нзПапки = Папка.Создать(мИерархия[0], {'Лицо1' : this.Договор.нзПродавец, 'Лицо2' : this.Договор.нзГрузоотправитель});
            } else {
                нзПапки = зНайтиПапкуПродавца.нзПапки;
            }
        } else {
            //Договор лежит в корне, продавец для него не определен
            //такая ситуация является ошибкой структуры папок, поэтому
            //создадим если нет папку с предустановленным именем
            if (!(нзНоваяПапка = Папка.Найти('Не определена', нзПапки)))
                нзНоваяПапка = Папка.Создать('Не определена');
            нзПапки = нзНоваяПапка;
        }


        var индИерархия;
        for (индИерархия = 0; индИерархия < мИерархия.length; ++индИерархия) {
            if(индИерархия > 0) {
                if (!(нзНоваяПапка = Папка.Найти(мИерархия[индИерархия], нзПапки))) {
                    let ДополнительныеЗначения = {};
                    if(индИерархия == мИерархия.length - 1) {
                        // для папки месяца необходимо прописать гурппу нумерации
                        // некий уникальный номер для каждого продавца за год
                        ДополнительныеЗначения['Группа нумерации'] = this.Договор.ПрефиксГруппНумерации + this.Месяц.toSQLString().substr(2, 2);
                    }
                    нзНоваяПапка = Папка.Создать(мИерархия[индИерархия], ДополнительныеЗначения, нзПапки);
                }
                нзПапки = нзНоваяПапка;
            }
        }


        return нзПапки;
    }

    ПолучитьПапку() {
        let нзПапки = -10;
        if(!(нзПапки = this.НайтиПапку())) {
            нзПапки = this.СоздатьПапку();
        }
        return нзПапки;
    }

    /**
     * Определяет можно ли формировать исходящий документ
     * для разных типов документов должны выполняться разные условия.
     * @returns {boolean}
     */
    МожноФормировать() {
        return true;
    }

    Сформировать(мДанные) {
        if(this.МожноФормировать()) {
            if(мДанные.length) {
                this.ПрочитатьИзКонтекста({
                    'Папки': this.ПолучитьПапку(), //мПапка.row_id;
                    'Номер': this.ПолучитьНовыйНомер(),
                    'Тема': this.ПолучитьТему(),
                    'Тип документа': this.Тип, //35 счет-фактура, 4 счет-фактура на аванс, 1 счет
                    'Состояние': 0, //0-Открыт, 4-Закрыт
                    'Дата': this.Дата, // Дата счета
                    'РасчМесяц': this.Месяц,
                    'ВидСчета': 1, //1 + ДопФактура;
                    'Аналитика': "", //индАналитика.substr(2),
                    'Лицо1': this.Договор.Объект.Плательщик,
                    'Лицо2': this.Договор.Объект.Грузополучатель,
                    'Документы-Договор': this.Договор.НомерЗаписи,
                    'Группа нумерации': this.ГруппаНумерации, //'мПапка.Группа нумерации';
                    'Автор': НомерЗаписи(Пользователь()),
                    'Примечание': this.ПолучитьПримечание(),
                    'Кол_во': 0
                });

                if (this.Внести()) {
                    this.ДобавитьДетализацию(мДанные);
                    this.ОбновитьИтоги(this.НомерЗаписи);
                    return true;
                }
            } else {
                throw new кОшибкиФормированияДокументов('Нет реализации');
            }
        }
        return false;
    }

    //TODO Объект для детализации
    //TODO Определить формат струкутры результатов расчета
    //TODO Написать анализ документов см.prg АнализФактур()
    ДобавитьДетализацию(Детализация) {
        let зВставитьНаименованиеСчета = Command (`
            INSERT INTO ~Наименования счета~ (
                [Склад-Наименования счета],[Счет-Наименования],[N п/п],[ЗаМесяц],
                [Кол_во],[Комментарий],[Тариф],[Группировка],
                [ЛицевыхСумма],[Сумма],[Сумма2],[Аналитика1]
                ,[Аналитика2]
            )
            VALUES (
                :1, :2, :3, :4,
                :5, :6, :7, :8,
                :9, :10, :11, :12,
                :13
            )
            `, 1000, "p1,S,p2,S,p3,S,p4,D,p5,N,p6,A,p7,N,p8,A,p9,N,p10,N,p11,N,p12,S,p13,A");

        var СтавкаНДС = this.Договор.ПолучитьСтавкуНДС(this.Дата);
        for ( let индСтрокаСчета in Детализация ) {
            if ( Детализация.hasOwnProperty(индСтрокаСчета) ) {
                let мСтрока = Детализация[индСтрокаСчета];
                let СуммаСНДС = мСтрока["Сумма"];
                let СуммаБезНДС = мСтрока["Сумма"];

                if (мСтрока["Сумма2"]) {
                    // Если установленно поле Сумма2, то суммы с ндс и без ндс уже посчтитаны
                    СуммаБезНДС = мСтрока["Сумма2"];
                } else {
                    //Надо посчитать только при этом определиться что будем считать
                    //Сумму без ндс от суммы с ндс или наоборот
                    //имеет смысл если продаваец работает с ндс
                    if (СтавкаНДС != 0) {
                        switch (мСтрока["ВариантНДС"]) {
                            case 0 :
                                // поле Сумма - сумма без ндс
                                СуммаСНДС = кНДСКалькулятор.СуммаСНДС(СуммаБезНДС, СтавкаНДС);
                            case 1 :
                                // поле Сумма - сумма с ндс
                                СуммаБезНДС = кНДСКалькулятор.СуммаБезНДС(СуммаСНДС, СтавкаНДС);
                        }
                    }
                }


                // _лицевыхСумма Имеет смысл только при формировании счетов-фактур
                let ЛицевыхСумма = 0;
                if (this.Тип == 35)
                    ЛицевыхСумма = (мСтрока["ВариантНДС"] == 1) ? СуммаСНДС : СуммаБезНДС;

                // или если поле заполнено в массиве с данными
                if (мСтрока["ЛицевыхСумма"])
                    ЛицевыхСумма = мСтрока["ЛицевыхСумма"];

                зВставитьНаименованиеСчета.Выполнить(
                    (мСтрока["Склад-Услуги"] > 0) ? мСтрока["Склад-Услуги"] : -1, this.НомерЗаписи, 0, мСтрока["Месяц"],
                    мСтрока["Объем"], мСтрока["Комментарий"], мСтрока["Тариф"], "",
                    ЛицевыхСумма, СуммаСНДС, СуммаБезНДС, мСтрока["Аналитика1"],
                    мСтрока["Аналитика2"]);
            }
        }
        зВставитьНаименованиеСчета.Завершить();
        return true;
    }
}


class кСчетФактура extends кИсходящийДокумент {
    /**
     *
     * @param Договор
     * @param ДатаДокумента
     * @param МесяцДокумента
     */
    constructor(Договор, ДатаДокумента, МесяцДокумента) {
        super(Договор, ДатаДокумента, МесяцДокумента);
        this.Тип = 35;
    }

    /**
     * Проверка можно ли формировать документ счет-фактура
     * счет-фактуру можно формировать при условии что в месяце формирования
     * документ еще не формировался.
     * @returns {boolean}
     * @function
     */
    МожноФормировать() {
        // проверим срок действия договора
        if(this.Договор.Действует(this.Месяц)) {
            // проверим наличие уже выставленной фактуры в этом месяце
            let зЕстьСчетФактура = Query(`
                SELECT TOP 1 Номер, Тема, Дата
                FROM ~Документ~
                WHERE [Документы-Договор] = :1
                AND [Тип документа] = 35
                AND [ВидСчета] < 100  -- исправленный и кор фактуры не берем
                AND [РасчМесяц] = :2
                --Есть вариант когда выставляется несколько документов
                --по разным видам деятельности
                --AND [Аналитика] IN (+ стрОснАналитики+)
                ORDER BY Дата, Номер
                `, 1, "dog,S,month,D" );

            зЕстьСчетФактура.УстановитьПараметры(this.Договор.НомерЗаписи, this.Месяц);
            if(зЕстьСчетФактура.Следующий()) {
                throw new кОшибкиФормированияДокументов('Уже есть сформированный за ' + this.Месяц.format("MMMM yyyy г.") + ' счет-фактура № ' + зЕстьСчетФактура.Номер);
            }
        } else {
            throw new кОшибкиФормированияДокументов('Срок договора истек.');
        }

        return true;
    }
}


class кСчетФактураНаАвансыПолученные extends кИсходящийДокумент {
    /**
     *
     * @param Договор
     * @param ДатаДокумента
     * @param МесяцДокумента
     */
    constructor(Договор, ДатаДокумента, МесяцДокумента) {
        super(Договор, ДатаДокумента, МесяцДокумента);
        this.Тип = 4;
    }

    /**
     * Проверка можно ли формировать документ счет-фактура
     * счет-фактуру можно формировать при условии что в месяце формирования
     * документ еще не формировался.
     * @returns {boolean}
     * @function
     */
    МожноФормировать() {
        return true;
    }
}

class gettersetter {
    constructor () {
        this._test = undefined;
    }

    get test() {
        if(this._test != undefined)
            return this._test;
        return "get";
    }

    set test(sss) {
        this._test = sss;
    }
}

/**
 * Вызов обработок из контекстного меню договоров
 */
class кДоговорКонтекстноеМеню {
    /**
     * Формирование документов по списку договоров
     */
    static ФормированиеИсходящихДокументов( ) {
        /**
         * TODO Вызов диалога для установки параметров формирования документов
         * TODO Месяц (а надо ли, возможно это ОткрытыйМесяц()?)
         * TODO Тип исходящего документа, список типов документов.
         */

        /* var ttt = new gettersetter();
        ttt.test = "set";
        Сообщить(ttt.test); */

        var Дата = new Date();
        var Месяц = new Date(ОткрытыйМесяц());
        var оДиалог = СоздатьДиалог("Формирование исходящих документов");
        оДиалог.ДатаДокумента = Дата;
        оДиалог.МесяцФормирования = Месяц;
        var оТаблица = {};

        if(оДиалог.Выполнить()) {
            var Дата = оДиалог.ДатаДокумента;
            var Месяц = оДиалог.МесяцФормирования;

            var оСписокДоговоров = new БазоваяВыборка(ИмяТекущегоОкна(), ТекущаяВыборка());
            var мСписокДоговоров = оСписокДоговоров.ПолучитьВыделенныеЗаписи();
            var инд;

            СоздатьОкноСостояния("Окно состояния", "Этап", "Формирование документов по договорам",
                "Действие", "Обработка договоров...",
                "Прогресс", мСписокДоговоров.length);
            var индСтрокиОтчета = 0;
            for (инд = 0; инд < мСписокДоговоров.length; ++инд) {
                УстановитьПоляОкнаСостояния("Прогресс", инд);
                var ТекущийДоговор = new кДоговор(мСписокДоговоров[инд]);

                try {
                    let Документ = new кСчетФактура(ТекущийДоговор, Дата, Месяц);
                    let Данные = ТекущийДоговор.ДанныеРасчетаДоговора(Месяц);
                    Документ.Сформировать(Данные);
                } catch (e) {
                    //console.log(e.Имя);
                    оТаблица[индСтрокиОтчета] = {
                        "Столбец1" : индСтрокиОтчета + 1,
                        "Столбец2" : ТекущийДоговор.Объект.Номер,
                        "Столбец3" : "", //Плательщик
                        "Столбец4" : "", //Ошибка / предупреждение
                        "Столбец5" : e.Текст};
                    индСтрокиОтчета++;
                }
            }
            УдалитьОкноСостояния();
            отчеты.ExecuteReport("Отчет по формированию исходящих документов", {"Таблица" : оТаблица, "МесяцФормирования" : Месяц}, 1);

        }
    }

    static ФормированиеСчетовФактурНаАвансыПолученные() {
        var Дата = new Date();
        var Месяц = new Date(ОткрытыйМесяц());
        var оДиалог = СоздатьДиалог("Формирование исходящих документов");
        оДиалог.ДатаДокумента = Дата;
        оДиалог.МесяцФормирования = Месяц;

        var оТаблица = {};

        if(оДиалог.Выполнить()) {
            var Дата = оДиалог.ДатаДокумента;
            var Месяц = оДиалог.МесяцФормирования;

            var оСписокДоговоров = new БазоваяВыборка(ИмяТекущегоОкна(), ТекущаяВыборка());
            var мСписокДоговоров = оСписокДоговоров.ПолучитьВыделенныеЗаписи();

            for (var инд = 0; инд < мСписокДоговоров.length; ++инд) {
                var Сальдо = new СальдоДоговора(мСписокДоговоров[инд]);
                var ТекущийДоговор = new кДоговор(мСписокДоговоров[инд]);
                Сальдо.Рассчитать(Месяц, true);

                //надо проверить даты платежа и фактуры
                //если фактура выставлена раньше платежа, то сумму не учитываем
                //.....
                //теперь надо прочитать сальдо и добавить к нему оставшийся кредит
                //.....

                for (let индДокумента in Сальдо.мСписокДокументов) {
                    if (Сальдо.мСписокДокументов.hasOwnProperty(индДокумента)) {
                        var СуммаАванса = Сальдо.мСписокДокументов[индДокумента].Сумма;
                        if (СуммаАванса > 0) {
                            var мНачДО = [];
                            мНачДО[0] = [];
                            мНачДО[0]["Объем"] = 0;
                            мНачДО[0]["ПОбъем"] = 0;
                            мНачДО[0]["ФОбъем"] = 0;
                            мНачДО[0]["Сумма"] = СуммаАванса;
                            мНачДО[0]["Сумма2"] = СуммаАванса;
                            мНачДО[0]["Склад-Услуги"] = -1;
                            мНачДО[0]["ВариантНДС"] = 0;
                            мНачДО[0]["Месяц"] = Месяц;
                            мНачДО[0]["Тариф"] = 0;
                            мНачДО[0]["_ВключатьВОбъем"] = 0;
                            мНачДО[0]["Аналитика1"] = 0;
                            мНачДО[0]["Аналитика2"] = "";
                            мНачДО[0]["Название"] = "";
                            мНачДО[0]["Комментарий"] = "за " + Месяц.МесяцПрописью() + " " + Месяц.getFullYear() + " г.";
                            мНачДО[0]["СуммаСФ"] = 0;

                            let Документ = new кСчетФактураНаАвансыПолученные(ТекущийДоговор, Дата, Месяц);
                            Документ.Сформировать(мНачДО);
                        }
                    }
                }
            }
        }
    }
}
