
console.log("octrace.js starting\n");
var ISA_MASK = ptr('0x0000000ffffffff8');
var ISA_MAGIC_MASK = ptr('0x000003f000000001');
var ISA_MAGIC_VALUE = ptr('0x000001a000000001');
var ISA_MAGIC_VALUE_MAC = ptr('0x000003f000000001');

// generic trace
function trace(pattern)
{
	var type = (pattern.indexOf(" ") === -1) ? "module" : "objc";
	var res = new ApiResolver(type);
	var matches = res.enumerateMatchesSync(pattern);
	var targets = uniqBy(matches, JSON.stringify);

	targets.forEach(function(target) {
		if(target.name.indexOf(".cxx_destruct") >= 0)
			return;
		if (type === "objc")
			traceObjC(target.address, target.name);
		else if (type === "module")
			traceModule(target.address, target.name);
	});
}

// remove duplicates from array
function uniqBy(array, key) 
{
	var seen = {};
	return array.filter(function(item) {
		var k = key(item);
		return seen.hasOwnProperty(k) ? false : (seen[k] = true);
	});
}
function getObjCClassPtr(p) {
    /*
     * Loosely based on:
     * https://blog.timac.org/2016/1124-testing-if-an-arbitrary-pointer-is-a-valid-objective-c-object/
     */

    if (!isReadable(p)) {
        return NULL;
    }
    var isa = p.readPointer();
    var classP = isa;

    if (classP.and(ISA_MAGIC_MASK).equals(ISA_MAGIC_VALUE)) {
        classP = isa.and(ISA_MASK);
    }
    if (isReadable(classP)) {
        return classP;
    }
    return NULL;
}

function isReadable(p) {
    try {
        p.readU8();
        return true;
    } catch (e) {
        return false;
    }
}
function isObjC(p) {
	initObjCMagic();
    var klass = getObjCClassPtr(p);
    return !klass.isNull();
}

function initObjCMagic() {
    //for macOS x86_64
    if ("x64" === Process.arch) {
        ISA_MASK = ptr('0x00007ffffffffff8');
        ISA_MAGIC_MASK = ptr('0x001f800000000001');
        ISA_MAGIC_VALUE = ptr('0x001d800000000001');
    }else{
        ISA_MASK = ptr('0x0000000ffffffff8');
        ISA_MAGIC_MASK = ptr('0x000003f000000001');
        ISA_MAGIC_VALUE = ptr('0x000001a000000001');
    }

}

// trace ObjC methods
function traceObjC(impl, name)
{
	console.log("Tracing " + name);
	Interceptor.attach(impl, {

		onEnter: function(args) {
			console.log("\nentered : \n" + name);

			// print full backtrace
			// console.log("\nBacktrace:\n" + Thread.backtrace(this.context, Backtracer.ACCURATE)
			//		.map(DebugSymbol.fromAddress).join("\n"));

			// print caller
			// console.log("\nCaller: " + DebugSymbol.fromAddress(this.returnAddress));

			// print args
			if (name.indexOf(":") !== -1) {
					var rep = /([a-zA-Z\d_]+?):/g
					var methods = name.match(rep)

					for (var i = 0; i < methods.length; i++) {
						if(isObjC(args[2 + i])){
							console.log(methods[i] + new ObjC.Object(args[2 + i]).toString() + " (ObjCObject)");
						}else {
							console.log(methods[i] + args[2 + i].toString() + "(NativeObject)");
						}

					}
			}
		},

		onLeave: function(retval) {
			if (isObjC(retval)) {
                console.log('RET: ' + new ObjC.Object(retval).toString());
            } else {
                console.log('RET: ' + retval.toString());
            }
		}

	});
}

// trace Module functions
function traceModule(impl, name)
{
	console.log("Tracing " + name);

	Interceptor.attach(impl, {

		onEnter: function(args) {
			// print args
			if (name.indexOf(":") !== -1) {
					var rep = /([a-zA-Z\d_]+?):/g
					var methods = name.match(rep)

					for (var i = 0; i < methods.length; i++) {
						if(isObjC(args[2 + i])){
							console.log(methods[i] + new ObjC.Object(args[2 + i]).toString() + " (ObjCObject)");
						}else {
							console.log(methods[i] + args[2 + i].toString() + "(NativeObject)");
						}

					}
			}
			// console.log("\nBacktrace:\n" + Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join("\n"));
		},

		onLeave: function(retval) {
			if (isObjC(retval)) {
                console.log('RET: ' + new ObjC.Object(retval).toString());
            } else {
                console.log('RET: ' + retval.toString());
            }
		}

	});
}


function test1(){
	var methods = ObjC.classes["MessageService"].$methods
	// console.log(methods)
	methods.forEach(function (method) {
		console.log(method)
		console.log(ObjC.classes["MessageService"][method].implementation)
		try {
			Interceptor.attach(ObjC.classes["MessageService"][method].implementation, {
				onEnter: function(args) {
					console.warn("\n*** entered " + method);
				}
			});
		}
		catch(err) {
			console.error("error" + err);
		}

	})
}

// usage examples
if (ObjC.available) {
	try {
		trace("*[MessageService *]")
	}catch (e) {
		console.error(e)
	}
	// trace("*[FireflySecurityUtil *]")
	// trace("*[ *ncrypt*]");
	// trace("exports:libSystem.B.dylib!CCCrypt");
	// trace("exports:libSystem.B.dylib!open");
	// trace("exports:*!open*");
	
} else {
 	send("error: Objective-C Runtime is not available!");
}
