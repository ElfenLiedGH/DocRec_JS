'use strict'

class Информация_о_ресурсе{
    constructor() {
        this.ПозицияВОбработчике = 0;
        this.ИмяФайлаОбработчика = "";
    }

    Инициализация() {
        var стр = 'Комментарии==0,128,0;;Courier New|9|2\n' + 'Цифры==0,0,255;;Courier New|9|0\n' + 'Строки==255,0,128;;Courier New|9|0\n' + '"(",")","]","[","+","-","=","!","<",">"==0,0,255;;Courier New|9|0\n' + '"{","}"==128,0,0;;Courier New|9|0\n' + "\"~\",\"`\"==255,0,0;;Courier New|9|1\n" + '"вернуть","выбор","выборпо","длявсех","если","иначе","пока","прервать",' + '"функция","перем"==128,0,0;;Courier New|9|1\n' + '"и","или"==128,128,128;;Courier New|9|0\n' + '"отладить"==255,0,0;;Courier New|9|1\n' + '"add","alter","as","asc","authorization","backup","begin",' + '"break","browse","bulk","by","cascade","case","check","checkpoint",' + '"close","clustered","collate","column","commit","compute","constraint",' + '"contains","containstable","continue","create","current","current_date",' + '"current_time","cursor","database","dbcc","deallocate","declare",' + '"default","delete","deny","desc","disk","distinct","distributed",' + '"double","drop","dump","else","end","errlvl","escape","except",' + '"exec","execute","exit","external","fetch","file","fillfactor",' + '"for","foreign","freetext","freetexttable","from","full","function",' + '"goto","grant","group","having","holdlock","identity","identity_insert",' + '"identitycol","if","index","insert","intersect","into","key","kill","lineno",' + '"load","merge","national","nocheck","nonclustered","of","off",' + '"offsets","on","open","opendatasource","openquery","openrowset",' + '"openxml","option","order","over","percent","plan","precision",' + '"primary","print","proc","procedure","public","raiserror","read",' + '"readtext","reconfigure","references","replication","restore",' + '"restrict","return","revert","revoke","rollback","rowcount",' + '"rowguidcol","rule","save","schema","securityaudit","select",' + '"set","setuser","shutdown","statistics","table","tablesample",' + '"textsize","then","to","top","tran","transaction","trigger",' + '"truncate","tsequal","union","unique","update","updatetext",' + '"use","values","varying","view","waitfor","when","where",' + '"while","with","writetext"==0,0,255;;Courier New|9|0\n' + '"all","and","any","between","cross","exists","in","inner","is","join",' + '"left","like","not","null","or","outer","pivot","right","some","unpivot"==128,128,128;;Courier New|9|0\n' + '"coalesce","convert","current_timestamp","current_user","nullif",' + '"session_user","system_user","user",' + '"sysdatetime","getdate","datename","datepart","day","month","year",' + '"datediff","dateadd","isdate","min","max","count","abs"==255,0,255;;Courier New|9|0\n';
        this.Обработчик = Editor("Информация о ресурсе", "handler");
        this.Обработчик.КлючевыеСлова(стр);
    }

    ОткрытиеВкладки( вкладка ) {
        switch ( вкладка ) {
            case "Обработчик":
                if ( this.ИмяФайлаОбработчика ) {
                    var СтрОбработчика = View("Информация о ресурсе", "Обработчик");
                    СтрОбработчика.Заголовок = "Обработчик - " + this.ИмяФайлаОбработчика;
                }

                if ( this.ПозицияВОбработчике > 0 ) {
                    var мТекст = this.Запись.handler.split('\n');
                    var индекс = 0;
                    while ( индекс++ < мТекст.length && this.ПозицияВОбработчике > 0 ) {
                        this.ПозицияВОбработчике -= мТекст[индекс].length;
                    }
                    ПозицияРедактора("Информация о ресурсе", "handler", мТекст.length - 1, 0);
                    ПозицияРедактора("Информация о ресурсе", "handler", индекс - 1, 0);
                    this.Обработчик.Скрытый = 0;
                    this.Обработчик.УстановитьФокус();
                    this.ПозицияВОбработчике = 0;
                }
                break;
        }
    }
}
/**
 * @class Информация_о_ресурсе___Список_объектов
 * @extends БазовоеДерево
 */
class Информация_о_ресурсе___Список_объектов extends БазовоеДерево {
    constructor() {
        super( "Информация_о_ресурсе___Список_объектов", "", 0, 0 );
    }

    /**
     * @private
     * @param мТекст
     * @param i
     * @param spaces
     * @param мОбъекты
     * @returns {*}
     */
    СформироватьИерархиюОбъектов( мТекст, i, spaces, мОбъекты )
    {
        var Раскрытый = 0;
        var ТекСтрока = "";
        var ОтступПодходит = false;
        мОбъекты.Потомки = [];
        if( !мТекст[i] ){
            return i;
        }
        var ПроверкаОтступа = new RegExp( "\\s{" + ( spaces ) + "}" );
        var k = i, t;
        while( k < мТекст.length ){
            ТекСтрока = мТекст[k];
            ОтступПодходит = ПроверкаОтступа.test(ТекСтрока, "gi");
            if( ОтступПодходит ){
                Раскрытый = 0;
                if( />{3}/gi.test(ТекСтрока) ){
                    Раскрытый = 1;
                    ТекСтрока = ТекСтрока.replace( />{3}/gi, "   ");
                }
                мОбъекты.Потомки[k] = [];
                мОбъекты.Потомки[k].Текст     = ТекСтрока.trimLeft();
                мОбъекты.Потомки[k].Раскрытый = Раскрытый;
                t = k;
                k = this.СформироватьИерархиюОбъектов( мТекст, k + 1, spaces + 3, мОбъекты.Потомки[k] );
                if( !Раскрытый ){
                    let link = мОбъекты.Потомки[t].Потомки;
                    for(let j in link ){
                        if ( !link.hasOwnProperty(j) ) continue;
                        if( link[j].Раскрытый ){
                            мОбъекты.Потомки[t].Раскрытый = 1;
                            break;
                        }
                    }
                }
                this.мУзлы[t] = мОбъекты.Потомки[t];
            }else {
                return k;
            }
        }
        return k;
    }
    Инициализация() {
        СоздатьОкноСостояния("Окно состояния - ждите");

        var Заголовок = View("Информация о ресурсе", "Header");
        var Редактор = View("Информация о ресурсе", "editor");
        this.Обработчик = View("Информация о ресурсе", "handler");
        this.Закладки = TabControl("Информация о ресурсе", "Закладки");

        super.Инициализация();
        var ПроверкаВыделения = RegExp( ">{3}", "gi" );
        var мОбъектов = [];
        this.мУзлы = [];
        var Раскрытый = 0, spaces = 3, ТекСтрока = "";
        var мТекст = Редактор.Текст.split("\n");

        var ПроверкаОтступа = new RegExp( "\\s{" + ( spaces ) + "}" );
        var ОтступПодходит = true;
        ТекСтрока = мТекст[0];
        while( true ) {
            ОтступПодходит = ПроверкаОтступа.test( ТекСтрока, "gi");
            if( ОтступПодходит ){
                spaces += 3;
                ПроверкаОтступа = new RegExp( "\\s{" + ( spaces ) + "}" );
            }
            else{
                spaces -= 3;
                break;
            }

        }
        let i = 0, t = 0;
        while( i < мТекст.length ) {
            ТекСтрока = мТекст[i];
            Раскрытый = 0;
            if (ПроверкаВыделения.test(мТекст[i])) {
                Раскрытый = 1;
                ТекСтрока = ТекСтрока.replace(ПроверкаВыделения, "   ");
            }
            мОбъектов[i] = [];
            мОбъектов[i].Раскрытый = Раскрытый;
            мОбъектов[i].Текст = ТекСтрока.trimLeft();
            мОбъектов[i].Потомки = [];
            t = i;
            i = this.СформироватьИерархиюОбъектов(мТекст, i + 1, spaces + 3, мОбъектов[i] );
            if( !Раскрытый ){
                let link = мОбъектов[t].Потомки;
                for(let j in link ){
                    if ( !link.hasOwnProperty(j) ) continue;
                    if( link[j].Раскрытый ){
                        мОбъектов[t].Раскрытый = 1;
                        break;
                    }
                }
            }
            this.мУзлы[t] = мОбъектов[t];
        }
        super.Инициализация();
        for( let k in мОбъектов ) {
            if ( !мОбъектов.hasOwnProperty(k) ) continue;
            var мИконки = this.ВыбратьИконки(мОбъектов[k].Текст, мОбъектов[k].Раскрытый);
            this.Меню = "Копировать имя";
            var ИмяЭлемента = мОбъектов[k].Текст.substr(мОбъектов[k].Текст.search(/[->=:]/gi) + 2);
            this.ДеревоОбъектов.Добавить(this, k, {
                "objectID": -1,
                "ИмяЭлемента": ИмяЭлемента
            }, мОбъектов[k].Текст, this.ВыбратьМеню(мОбъектов[k].Текст), мОбъектов[k].Раскрытый, мИконки.Иконка, мИконки.ИконкаРаскрытый)
        }
        return this.ДеревоОбъектов;
    }
    ЗаполнитьУровень( Узел ){
        var ТекущийУзел = super.ЗаполнитьУровень( Узел );
        var link = this.мУзлы[ТекущийУзел.ID].Потомки, мИконки, ИмяЭлемента;
        for( let i in link ){
            if ( !link.hasOwnProperty(i) ) continue;
            мИконки = this.ВыбратьИконки( link[i].Текст, link[i].Раскрытый );
            ИмяЭлемента =  link[i].Текст.substr( link[i].Текст.search( /[->=:]/gi ) + 2 );
            ТекущийУзел.Добавить( this, i, { "objectID" : -1, "ИмяЭлемента" : ИмяЭлемента }, link[i].Текст, this.ВыбратьМеню( link[i].Текст ), link[i].Раскрытый, мИконки.Иконка, мИконки.ИконкаРаскрытый )
        }
        return ТекущийУзел;
    }
    Меню( Узел ) {
        return this.ВыполнитьКоманду( Узел.СобытиеМеню, Узел);
    }
    ВыбратьМеню( Текст ){
        var Меню = "";
        if( /Обработчик элемента/gi.test( Текст ) ){
            Меню = "Обработчик элемента;";
        }
        if( /Выборка/gi.test( Текст ) ){
            Меню = "Обработчик выборки;";
        }
        return Меню + this.Меню;
    }
    ВыбратьИконки( Текст, Раскрытый ){
        var Иконка = "16x16\\folder_closed.png";
        var ИконкаРаскрытый = "16x16\\folder_opened.png";
        if (/=/gi.test(Текст)) {
            Иконка = "16x16\\property.png";
            ИконкаРаскрытый = Иконка;
        }else if (/->/gi.test(Текст)) {
            Иконка = "16x16\\lightning.png";
            ИконкаРаскрытый = Иконка;
        }else if (/:/gi.test(Текст)) {
            Иконка = "16x16\\item_green.png";
            ИконкаРаскрытый = Иконка;
        }
        if( Раскрытый ){
			Иконка = "16x16\\item.png";
            ИконкаРаскрытый = Иконка;
        }
        return { "Иконка" : Иконка, "ИконкаРаскрытый" : ИконкаРаскрытый };
    }
    Изменение( узелДерева ) {
        var меню = узелДерева.Меню.substr(0, узелДерева.Меню.indexOf(";", 0));
        if ( меню.length > 0 )
            this.ВыполнитьКоманду(меню, узелДерева);

        return узелДерева;
    }



    ВыполнитьКоманду( Команда, УзелДерева ) {
        switch ( Команда ) {
            case "Копировать имя":{
                var буфер = БуферОбмена();
                буфер.Записать(УзелДерева.Данные.ИмяЭлемента, "txt");
                break;
            }
            case "Обработчик элемента":
            case "Обработчик выборки":
            case "Обработчик ресурса":{
                var ИмяЭлемента = УзелДерева.Данные.ИмяЭлемента.toString().toUpperCase();
                if (!ИмяЭлемента) return "";
                var каталог = ИзвлечьПуть(КаталогБазы()) + "\\prg\\";
                var мHdl = СодержимоеКаталога(каталог + "*.hdl", 1);
                var кол = Размер(мHdl), инд = 1, стр, стрВ, ткст1 = `ФУНКЦИЯ ` + ИмяЭлемента, ткст2 = `ФУНКЦИЯ '` + ИмяЭлемента + `'`;
                var поз, файл;
                while (инд <= кол) {
                    файл = ОткрытьФайл(каталог + мHdl[инд]);
                    стр = ПрочитатьДвоичныйФайл(файл);
                    стрВ = стр.toString().toUpperCase();
                    ЗакрытьФайл(файл);
                    стрВ = стрВ.replaceAll("\r\n", "");
                    поз = стрВ.indexOf(ткст1);
                    if (поз == 0) поз = стрВ.indexOf(ткст2);
                    if (поз) {
                        this.Обработчик.Текст = стр;
                        this.Обработчик.Скрытый = 1;
                        ЗаписатьВОбработчикДиалога("Информация о ресурсе", "ПозицияВОбработчике", поз);
                        ЗаписатьВОбработчикДиалога("Информация о ресурсе", "ИмяФайлаОбработчика", мHdl[инд]);
                        this.Закладки.ОткрытьСтраницу(2);
                        инд = кол + 1;
                    }
                    else инд++
                }
            }
        }
        return УзелДерева;
    }
}
