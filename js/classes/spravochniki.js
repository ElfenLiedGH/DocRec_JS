'use strict';
/**
 * Содержит функционал по работе с организациями
 * @extends БазовыйОбъект
 * @class  класс кОрганизация
 */
class кОрганизация extends БазовыйОбъект {
    constructor( номерЗаписи, контекст ) {
        super( "Организации", номерЗаписи, контекст );
		
		if( typeof НомерЗаписи === "number" ){
			this.Прочитать();
		} else if( typeof НомерЗаписи === "object" ){
			this.ПрочитатьИзКонтекста( НомерЗаписи )
		}
    }

    /**
     * Проверяет корректность названия организации
     * @param Название Название организации
     * @param Наименование Нименование организации
     * @returns {boolean} true если корректно, иначе false
     */
    ПроверитьКорректностьНазвания( Название, Наименование ) {
        return !( Название.ЕстьСмесьАлфавитов() || Наименование.ЕстьСмесьАлфавитов() );
    }

    /**
     *
     * @param стрПараметры  {string} строка параметров для создания на организации ПР. НАСПУНКТ,ЯРОСЛАЛЬ;ЛИЦЕНЗИЯ,0;ЗАДАЧИ,0
     * @param ДатНач {Date} Дата начала параметра, если не указать будет 19800101
     * @param ДатКнц {Date} Дата конца параметров, если не указать будет 20450509
     * @returns {number} возвращает 1, если параметры добавлены и 0 при ошибке
     */
    СоздатьПараметрыПоУмолчанию( стрПараметры, ДатНач, ДатКнц ) {
        if (this.НомерЗаписи <= 0) {
            return 0;
        }
        var мПараметры = стрПараметры.split(';')
        var оПараметр = Объект("Значения параметров");
        var зПараметры = Query("SELECT ROW_ID FROM ~Параметры~ WHERE Имя like :1", 1, "name, A");
        for (let Элемент in мПараметры) {
            if (!мПараметры.hasOwnProperty(Элемент)) continue;
            let мЗначение = мПараметры[Элемент].split(',');
            зПараметры.УстановитьПараметры(мЗначение[0]);
            while (зПараметры.Следующий()) {
                оПараметр['Орг-Параметры'] = this.НомерЗаписи;
                оПараметр['Параметр-Значения'] = зПараметры.ROW_ID;
                оПараметр['Значение'] = мЗначение[1] != undefined ? 0 : мЗначение[1];
                оПараметр['ДатНач'] = ДатНач != undefined ? ДатНач : new Date(1980, 0, 1);
                оПараметр['ДатКнц'] = ДатКнц != undefined ? ДатКнц : new Date(2045, 8, 5);
                оПараметр['Значение-Автор'] = НомерЗаписи(Пользователь());
                ВнестиЗапись(оПараметр);
            }
        }
    }

    /**
     * Возвращает массив с представителями организации из текущего объекта
     * @returns {Array.<Object>}
     */
    ПолучитьПредставителейОрганизации(){
        return кОрганизация.ПолучитьПредставителейОрганизации(this.НомерЗаписи);
    }
    /**
     * Возвращает массив с представителями организации
     * @param НомерЗаписи {Number=} Номер записи организации, если не указан, то Лицо0
     * @returns {Array.<Object>} Массив объектов индексами которого является тип представителя
     * (0 - неизвестный подписант, 1 - руководитель, 2- гл.бухгалтер, 3 - первая подпись, 4 - вторая подпись)
     * У элемента массива (объекта) имеются поля: Должность,ФИО,РДолжность,РФИО,Основание
     */
    static ПолучитьПредставителейОрганизации(НомерЗаписи) {
        let Подписи = [];
        // TODO код подразделения не перенесен, т.к. странно как то сделано
        let з_представителей = Query(`SELECT ФИО, Признаки, Должность, Примечание, РФИО, РДолжность, КодПодразделения, ROW_ID
                                        FROM ~Частные лица~
                                       WHERE [Организация-Частные лица] = :1
                                       ORDER BY Признаки`, 100, "org,N");
        з_представителей.УстановитьПараметры(НомерЗаписи ? НомерЗаписи : Лицо0());
        while (з_представителей.Следующий()) {
            let ТипПодписанта = з_представителей.Признаки;
            let Представитель = {};
            Представитель["Должность"] = з_представителей.Должность;
            Представитель["ФИО"] = з_представителей.ФИО;
            Представитель["РДолжность"] = з_представителей.РДолжность;
            Представитель["РФИО"] = з_представителей.РФИО;
            Представитель["Основание"] = з_представителей.Основание;
            Представитель["ROW_ID"] = з_представителей.ROW_ID;
            if (!Подписи[ТипПодписанта]) Подписи[ТипПодписанта] = [];
            Подписи[ТипПодписанта].push(Представитель);
        }
        return Подписи;
    }

    // TODO
    ПолучитьРасчетныйСчет(номпп) {

    }
    ЭлектронныйАдресОбязательнойКопии() {
        var копия = '';
        var зКопии = Query( 'SELECT kont.email, kont.ФИО ' +
            'FROM ~Частные лица~ kont JOIN ~Организации~ org ON kont.[Организация-Частные лица]=org.ROW_ID ' +
            'WHERE org.ROW_ID=:1 AND kont.Ф1&1 >0', 50, "org,S" );
        зКопии.УстановитьПараметры( this.НомерЗаписи );
        //Очистить( мАдрес );
        while( зКопии.Следующий() ) {
            if( !зКопии.email ) continue;

            var мАдрес = зКопии.email.split( ";" );
            for( let n in мАдрес ) {
                if( !мАдрес.hasOwnProperty(n) || !мАдрес[n].trim() ) continue;
                var позНач = 0;
                if( (позНач = мАдрес[n].indexOf( "<" )) != -1 ) {// в адресе указано и имя адресата, просто копируем
                    копия += ";" + мАдрес[n];
                } else if( n == 0 ) { // имя адресата не нашли - добавляем только один раз
                    копия += ";" + зКопии.ФИО + " <" + мАдрес[n].trim() + ">";
                } else {
                    копия += ";" + мАдрес[n].trim();
                }
            }
        }
        return копия.substr( 1 );
    }
}

/**
 * @class класс кЧеловек - класс человека, должен быть создан при работе с таблицей "Карточки регистрации"
 */
class кЧеловек extends БазовыйОбъект {
    /**
     * @param фио - Фамилия Имя Отчество в одну строку через пробел или множество пробелов именно в таком порядке
     * @type {string}
     */
    constructor( Фио ) {
        super( 'Карточки регистрации', -1 );
        /**
         * Фио - содержит Фамилию Имя Отчество в одну строку именно в таком порядке
         * @type {string}
         */
        this.Фио = Фио.trimLeft();
        /**
         * Фамилия - фамилия человека
         * @type {string}
         */
        this.Фамилия = '';
        /**
         * Имя - имя человека
         * @type {string}
         */
        this.Имя  = '';
        /**
         * Имя - отчество человека
         * @type {string}
         */
        this.Отчество = '';
    }

    /**
     * создает из Фио фамилию, имя и отчество для человека
     */
    РаспаковатьФио() {
        var мСодержание = this.Фио.split(/\s+/);
        if( мСодержание[0] ) this.Фамилия = мСодержание[0];
        if( мСодержание[1] ) this.Имя = мСодержание[1];
        if( мСодержание[2] ) this.Отчество = мСодержание[2];
    }
    УпаковатьФио( фамилия, имя, отчество ){
        фамилия = фамилия != undefined ? фамилия.trim() : this.Фамилия;
        имя = имя != undefined ? имя.trim() : this.Имя;
        отчество = отчество != undefined ? отчество.trim() : this.Отчество;
        this.Фио = фамилия;
        if( имя ) {
            if( this.Фио ) this.Фио += " ";
            this.Фио += имя;
        }
        if( отчество ) {
            if( this.Фио ) this.Фио += " ";
            this.Фио += отчество;
        }
        return this.Фио;
    }
    // Возвращает ФИО в формате И.О.Фамилия. Если на входе фамилия с инициалами без пробела,
    // попытается отработать верно (найти инициалы  и вернуть строку нужного формата)
    ИОФ()
    {
        this.РаспаковатьФио();
        return this.Имя.substr(0,1) + "." + this.Отчество.substr(0,1) + ". " + this.Фамилия;
    }
    static СЗаглавной( строка ){
        return строка.trimLeft().substr(0, 1).toUpperCase() + строка.trimRight().substring(1);
    }
}

/**
 * @class класс кСотрудник - класс для работы с объектом сотрудника (может есть смысл унаследовать от базового объекта)
 */
class кСотрудник extends БазовыйОбъект{
    /**
     * @param запись - запись таблицы Сотрудники или Диалога Сотрудник
     * @param логин - логин сотрудника для входа на сервер
     */
    constructor( запись, логин ) {
        super( 'Сотрудники' );
        // TODO не должен был он с записью работать изначально...
        if( typeof запись == "number" ){
            this.Прочитать( запись );
            запись = this.Объект;
        }

        /**
         * объект для работы с ФИО сотрудника, инициализируется при необходимости
         * @type {кЧеловек}
         */
        this.ФИО = undefined;
        this.Узел = ЭтоУзел(запись, "Сотрудники");

        /**
         * row_id сотрудника из таблицы Сотрудники
         * @type {number}
         */
        this.НомерЗаписи = НомерЗаписи(запись);
        this.ТабНомер = запись.ТабНомер;
        this.признакиСообщения = запись.признакиСообщения;
        this.Иерархия = ПрочитатьПолеСвязи(запись, "Сотрудники");
        this.РодПризнаки = запись.Сотрудники.признакиСообщения;
        this.Телефон = запись.Телефон;
        /**
         * флаги сотрудника
         *  - 1 - сотрудник является Супервизором
         *  - 2 - сотрудник является Администратором базы данных
         *  @type {number}
         */
        this.Ф1 = ПрочитатьПолеСвязи(запись, "@Ф1");
        /**
         * флаги сотрудника
         *  - 2048 - сотруднику разрешена Работа в закрытом периоде
         *  @type {number}
         */
        this.Ф2 = ПрочитатьПолеСвязи(запись, "@Ф2");
        /**
         * логин сотрудника для входа на сервер
         * @type {string}
         */
        this.Логин = логин;
        /**
         * фамилия имя отчество сотрудника, сложенные в одну строку
         * @type {string}
         */
        this.Фио = запись.ФИО;
        /**
         * массивы пользователей сотрудника:
         *        - Номер - пользователь связан с сотрудникам по табельному номер (Сотрудник.ТабНомер = Пользователь.Номер)
         *        - Логин - пользователь связан с сотрудникам по логину (Сотрудник.Логин = Пользователь.Имя)
         * @type {{Номер: Array, Логин: Array}}
         */
        this.Пользователи = {Номер: [], Логин: []};
    }

    /**
     * Проверяет данные, введенные пользоваетлем, при радактировании сотруддника
     * @returns {boolean} - возвращает false, если данные введены не корректно:
     * - введен уже используемый табельный номер для сотрудника
     * - папка с признаком "Обособленное подразделение" в сотрудниках создана в папке без этого признака (не в корне)
     */
    ПроверкаСотрудника() {
        var зСотр = BufferedReader("SELECT ROW_ID from ~Сотрудники~ where [ТабНомер]=:1 and Сотрудники_ADD=:2", 1, "ТН,S,p,S");
        зСотр.УстановитьПараметры(this.ТабНомер, !this.Узел);
        while ( зСотр.Следующий() )
            if ( зСотр.ROW_ID != this.НомерЗаписи ) {
                Сообщить((this.Узел ? "Код подразделения " : "Табельный номер ") + "должен быть уникальным");
                return false;
            }
        // обособленное подразделение можно создавать только внутри обособленного подразделения или в корне
        if ( this.Узел && (this.признакиСообщения % 2 == 1) && this.Иерархия > 0 ) {
            if ( this.РодПризнаки % 2 == 0 ) {
                Сообщить("Обособленное подразделение можно создавать только внутри обособленного подразделения или в корне.");
                return false;
            }
        }
        return true;
    }

    /**
     * читает пользователей сотрудника по табельному номеру (Сотрудник.ТабНомер = Пользователь.Номер)
     * @param прочитать - перечитывает пользователей повторно, предварительно очистив массив
     * @returns {массив} - массив записей пользователей с полями ROW_ID, Ф1, Ф2, Имя из таблицы Пользователи
     */
    ПолучитьПользователей( прочитать ) {
        if ( прочитать ) {
            this.Пользователи.Номер.length = 0;
            var зПользов = Query('SELECT ROW_ID, Ф1, Ф2, Имя FROM ~Пользователи~ WHERE Номер = :1 ORDER BY Код', 1, "S,S");
            зПользов.УстановитьПараметры(this.ТабНомер);
            while ( зПользов.Следующий() ) {
                this.Пользователи.Номер.push( { 'ROW_ID' : зПользов.ROW_ID,
                    'Ф1' : зПользов.Ф1,
                    'Ф2' : зПользов.Ф2,
                    'Имя' : зПользов.Имя } );
            }
        }
        return this.Пользователи.Номер;
    }

    /**
     * читает пользователей сотрудника по логину (Сотрудник.Логин = Пользователь.Имя)
     * @param прочитать - перечитывает пользователей повторно, предварительно очистив массив
     * @returns {массив} - массив из ROW_ID таблицы Пользователи
     */
    ПолучитьПользователейЛогин( _логин, прочитать ) {
        if ( прочитать ) {
            this.Пользователи.Логин.length = 0;
            var зЛогин = Query('SELECT ROW_ID FROM ~Пользователи~ WHERE Имя =:1', 1, "lgg,A");
            зЛогин.УстановитьПараметры(_логин);
            while ( зЛогин.Следующий() )
                this.Пользователи.Логин.push(зЛогин.ROW_ID);
        }
        return this.Пользователи.Логин;
    }

    /**
     * удаляет пользователей сотрудника, связанных с ним по табельному номеру
     */
    УдалитьПользователей() {
        if ( this.Узел ) return;

        var вПольз = ПолучитьВыборку("Пользователи");
        // удаляем всех пользователей с таким же табельным номером
        var пользователи = this.ПолучитьПользователей(true);
        for ( let польз in пользователи ) {
            if ( !пользователи.hasOwnProperty(польз) ) continue;
            ПрочитатьЗаписьТаблицы(вПольз, пользователи[польз].ROW_ID);
            УдалитьЗапись(вПольз, пользователи[польз].ROW_ID);
        }
    }

    /**
     * Создает логин сотрудника по введенному ФИО в виде Фамилия_ИО
     */
    СоздатьЛогин() {
        this.ФИО = new кЧеловек(this.Фио);
        this.ФИО.РаспаковатьФио();
        // собственно формируем логин
        this.Логин = this.ФИО.Фамилия.toUpperCase() + "_" + this.ФИО.Имя.charAt(0).toUpperCase() +
            this.ФИО.Отчество.charAt(0).toUpperCase();
        if ( this.Логин.charAt(0) == "_" )
            this.Логин = this.Логин.substr(1, this.Логин.length - 1);
        if ( this.Логин.charAt(this.Логин.length - 1) == "_" )
            this.Логин = this.Логин.substr(0, this.Логин.length - 1);
    }

    /**
     * Корректирует ввденный логин в соответствии с уже имеющимися логинами на сервере, чтобы не блыло двух сотрудников
     * с одним логином, добавляя к нему табельный номер сотрудника
     */
    ПроверитьЛогин() {
        var i = 0, логин = this.Логин;
        var пользователи = this.ПолучитьПользователейЛогин(this.Логин, true);
        while ( пользователи.length > 0 ) {
            логин = this.Логин + ( this.ТабНомер + i++ );
            if ( логин.charAt(0) == "_" )
                логин = логин.substring(1, логин.length - 1);
            if ( логин.charAt(логин.length - 1) == "_" )
                логин = логин.substring(0, логин.length - 1);
            пользователи = this.ПолучитьПользователейЛогин(логин, true);
        }
        this.Логин = логин;
    }

    /**
     * Создает случайный пароль для сотрудника, состоящий из 4 символов
     * @returns {string} - созданный пароль
     */
    static СгенеритьПароль() {
        var пароль = '';
        while ( пароль.length <= 4 ) {
            var символ = rand_char();
            if ( символ != 'o' && символ != 'O' && символ != '0' ) пароль += символ;
        }
        return пароль;
    }

    /**
     * Изменяет пароль для логина (передается первым аргументом)
     * если не был передан логин, то спрашивает его у пользователя
     * если не был передан пароль, то спрашивает пароль для логина
     * @returns {boolean} - true, если пользователь не отказался от ввода данных
     */
    static СменитьПарольПользователя() {
        var логин = arguments[0] != undefined ? arguments[0] : "";
        var пароль = arguments[1] != undefined ? arguments[1] : "";
        var пароль2 = arguments[2] != undefined ? arguments[2] : "";
        if ( !логин && !Спросить("Логин:", логин) )
            return false;

        if ( !пароль ) {
            var дПароль = СоздатьДиалог("Пользователь (новый пароль)");
            if ( !ВыполнитьДиалог(дПароль) ) {
                //УдалитьПеременную(дПароль); // todo delete не работает с типами Muzzle
                return false;
            }
            пароль = дПароль['@Пароль1'];
            пароль2 = дПароль['@Пароль2'];
            //УдалитьПеременную( дПароль );
        }

        if ( пароль != пароль2 ) return false;

        var pwd = Command('ALTER LOGIN ' + логин + " WITH PASSWORD = '" + пароль + "'", 1);
        pwd.Выполнить();
        pwd.Завершить();
        return true;
    }

    /**
     * В зависимости от состояния пользователя сотрудника создает, запрещает или разрешает доступ сотруднику с указанным row_id
     * @param режим - режим работы функции:
     * - 0 - для работы функции из выборки сотрудников,
     * - 1 - для работы функции из диалога Сотрудник - дополнительно запрещает или разрешает кнопки в диалоге
     * @param сотрудник - row_id сотрудника
     */
    static СоздатьУдалитьПользователя( режим, сотрудник ) {
        //запрос для проверки существования корректно созданных учетных записей sqlserver и базы данных
        var srv = Query('SELECT TOP 1 su.principal_id \
         FROM [sys].database_principals u \
              JOIN [sys].server_principals su ON su.name=u.name AND su.[sid] = u.[sid] \
         WHERE u.name = :1', 1, "user_name,A");

        // запрос для проверки существования пользователя Стек
        var зПольз = Query('SELECT TOP 1 ROW_ID, Имя, Ф2 FROM ~Пользователи~ WHERE Номер=:1 ORDER BY Код', 1, "numb,S");
        var добПольз = Command("DECLARE @code int; \
         SET @code = (SELECT Max(Код) FROM ~Пользователи~) \
         INSERT INTO ~Пользователи~ (Номер, Код, Ф1, Ф2, Имя, Пароль) \
         VALUES(:1, (isnull(@code,0)+1), :2, :3, :4, '')", 1, "tab,S,f1,S,f2,S,name,A");

        // запрос установленного в данной базе Department.
        // Если не 0 и не совпадает с ТабНомер папки сотрудника, учетные записи на сервере создавать не будем
        var зДеп = Query('SELECT TOP 1 Значение1 FROM ~Управление~ WHERE Тип=0', 1, "");

        // запрос Department в папке сотрудника( с учетом галки "Обособленное подразделение" - 0 бит в поле Признаки на папках )
        var зКодПапки = Query("WITH child AS (\
          SELECT ТабНомер, Признаки, ROW_ID, Сотрудники, Сотрудники_ADD, (convert(varchar(100), '|')) AS sort \
          FROM ~Сотрудники~ where row_id = :1 \
          UNION ALL \
          SELECT parent.ТабНомер, parent.Признаки, parent.ROW_ID, parent.Сотрудники, parent.Сотрудники_ADD, (convert(varchar(100), child.sort+' ')) as sort \
          FROM child \
               JOIN ~Сотрудники~ parent ON parent.row_id = child.Сотрудники \
         ) \
         SELECT TOP 1 ТабНомер FROM child \
         WHERE Сотрудники_ADD=0 AND (Признаки & 1) = 1 \
         ORDER BY sort+'|' desc ", 1, "id,S");

        зДеп.УстановитьПараметры();
        var деп = зДеп.Следующий() ? зДеп.Значение1 : 0;

        // проверим наличие записи таблицы Пользователи.Если нет - создадим объект
        var оСотр;
        if ( режим == 0 ) { // при изменении сотрудников из выборки прочитаем запись
            if ( сотрудник == undefined ) return 0;

            оСотр = Объект("Сотрудники");
            ПрочитатьЗаписьТаблицы(оСотр, сотрудник);
            if ( НомерЗаписи(оСотр) < 0 ) return 0;
        } else // при изменении из диалога - возьмем запись самого диалога
            оСотр = сотрудник;
        // сохраним, если еще не сохранена
        if ( НомерЗаписи(оСотр) < 0 ) СохранитьЗапись(оСотр);
        зКодПапки.УстановитьПараметры(НомерЗаписи(оСотр))
        var кодПапки = зКодПапки.Следующий() ? зКодПапки.ТабНомер : 0;

        зПольз.УстановитьПараметры(оСотр.ТабНомер);
        if ( !зПольз.Следующий() ) {
            var имя = режим == 1 ? оСотр['@Логин'] : оСотр.Логин;
            var ф1 = режим == 1 ? ПрочитатьПолеСвязи(оСотр, "@Ф1") : 0;
            //var ф2 = оСотр['@Ф2'] !== undefined ? ПрочитатьПолеСвязи( оСотр, "@Ф2" ) : 0;
            var ф2 = режим == 1 ? ПрочитатьПолеСвязи(оСотр, "@Ф2") : 0;
            var сотрудник = new кСотрудник(оСотр, имя);
            if ( !имя ) {
                сотрудник.СоздатьЛогин();
                сотрудник.ПроверитьЛогин();
            }
            // имя есть, проверим на уникальность
            else if ( сотрудник.ПолучитьПользователейЛогин(имя, true).length > 0 )
                return 0;
            добПольз.Выполнить(оСотр.ТабНомер, ф1, ф2, сотрудник.Логин);
            добПольз.Завершить();
            зПольз.УстановитьПараметры(оСотр.ТабНомер);
            if ( !зПольз.Следующий() ) return 0;
            if ( режим == 1 ) {
                ЗапретитьЭлементыОкна("Сотрудник", "@Логин", "ТабНомер", "Права", "Сменить");
                УстановитьЗаголовокЭлемента("Сотрудник", "Создать", "Разрешить");
            }
        }

        // Если это не доменная аутентификация, настраиваемая через группы пользователей
        // проверим наличие логина на сервере, связанного с пользователем в БД с именем Имя из таблицы Пользователи
        if ( ПрочитатьКонстанту(new Date(), "ВИДАУТЕНТИФ") != 2 ) {
            srv.УстановитьПараметры(зПольз.Имя);
            if ( !srv.Следующий() ) {
                ОткрытьДоступКСерверу(зПольз.Имя, "", (зПольз.Ф2 & 2));
                if ( режим == 1 ) УстановитьЗаголовокЭлемента("Сотрудник", "Разрешить", "Запретить");
            } else {
                if ( режим == 1 ) УстановитьЗаголовокЭлемента("Сотрудник", "Запретить", "Разрешить");
                ЗапретитьДоступКСерверу(зПольз.Имя);
            }
        }
    }
    ПолучитьНзОрганизации(){
        var зВверх = Query( `with child as
                        (
                           select row_id, Сотрудники, Сотрудники_ADD, convert(varchar(100),'1') as sort,
                                  [Сотрудник-Организация] as Грузополучатель, ФИО, ТабНомер, Признаки
                             from ~Сотрудники~ where row_id=:1
                           union all
                           select parent.row_id, parent.Сотрудники, parent.Сотрудники_ADD, convert(varchar(100), child.sort + ' ') as sort,
                                  parent.[Сотрудник-Организация] as Грузополучатель, parent.ФИО, parent.ТабНомер, parent.Признаки
                           from ~Сотрудники~ parent
                           join child on parent.row_id = child.[Сотрудники]
                        )
                        select Top 1 row_id, Сотрудники as Папки, Грузополучатель, ФИО, ТабНомер
                          from child where Сотрудники_ADD = 0 and (Признаки & 1) = 1
                        order by sort+'|' desc
                     `, 10, "id,S" );
        зВверх.УстановитьПараметры( this.НомерЗаписи );
        if( зВверх.Следующий() ) return зВверх.Грузополучатель;
        return -1;
    }
}